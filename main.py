from datetime import datetime
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

import models
from database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Registration & Tasks API")
security = HTTPBasic()


# ---------- Pydantic схемы ----------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    email: EmailStr
    message: str


class TaskCreate(BaseModel):
    title: str
    deadline: datetime


class TaskUpdate(BaseModel):
    title: str | None = None
    deadline: datetime | None = None


class TaskResponse(BaseModel):
    id: int
    title: str
    deadline: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class HabitCreate(BaseModel):
    title: str
    description: str | None = None


class HabitResponse(BaseModel):
    id: int
    title: str
    description: str | None
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True


# ---------- Аутентификация ----------

def authenticate(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
    db: Session = Depends(get_db),
) -> models.User:
    user = db.query(models.User).filter(models.User.email == credentials.username).first()
    if not user or user.password != credentials.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return user


# ---------- Регистрация ----------

@app.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = models.User(email=payload.email, password=payload.password)
    db.add(user)
    db.commit()
    return RegisterResponse(email=payload.email, message="User registered successfully")


# ---------- Задачи ----------

@app.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    current_user: Annotated[models.User, Depends(authenticate)],
    db: Session = Depends(get_db),
) -> TaskResponse:
    task = models.Task(
        title=payload.title,
        deadline=payload.deadline,
        created_at=datetime.utcnow(),
        owner_email=current_user.email,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.get("/tasks", response_model=list[TaskResponse])
def list_tasks(
    current_user: Annotated[models.User, Depends(authenticate)],
    db: Session = Depends(get_db),
) -> list[TaskResponse]:
    return db.query(models.Task).filter(models.Task.owner_email == current_user.email).all()


@app.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    current_user: Annotated[models.User, Depends(authenticate)],
    db: Session = Depends(get_db),
) -> TaskResponse:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update")
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.owner_email == current_user.email)
        .first()
    )
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    for key, value in updates.items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    current_user: Annotated[models.User, Depends(authenticate)],
    db: Session = Depends(get_db),
) -> None:
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.owner_email == current_user.email)
        .first()
    )
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    db.delete(task)
    db.commit()


# ---------- Привычки ----------

@app.get("/habits", response_model=list[HabitResponse])
def list_my_habits(
    current_user: Annotated[models.User, Depends(authenticate)],
    db: Session = Depends(get_db),
) -> list[HabitResponse]:
    return db.query(models.Habit).filter(models.Habit.user_id == current_user.id).all()


@app.post("/habits", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
def create_habit(
    payload: HabitCreate,
    current_user: Annotated[models.User, Depends(authenticate)],
    db: Session = Depends(get_db),
) -> HabitResponse:
    habit = models.Habit(
        title=payload.title,
        description=payload.description,
        created_at=datetime.utcnow(),
        user_id=current_user.id,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@app.get("/users/{user_id}/habits", response_model=list[HabitResponse])
def get_user_habits(user_id: int, db: Session = Depends(get_db)) -> list[HabitResponse]:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user.habits
