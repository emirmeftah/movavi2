from datetime import datetime
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, EmailStr

app = FastAPI(title="Registration & Tasks API")
security = HTTPBasic()

users: dict[str, str] = {}
tasks: dict[str, list[dict]] = {}
_task_counter = 0


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    email: EmailStr
    message: str


class TaskCreate(BaseModel):
    title: str
    deadline: datetime


class Task(BaseModel):
    id: int
    title: str
    deadline: datetime
    created_at: datetime


def authenticate(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
) -> str:
    email = credentials.username
    if email not in users or users[email] != credentials.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return email


@app.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> RegisterResponse:
    if payload.email in users:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    users[payload.email] = payload.password
    tasks[payload.email] = []
    return RegisterResponse(email=payload.email, message="User registered successfully")


@app.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    email: Annotated[str, Depends(authenticate)],
) -> Task:
    global _task_counter
    _task_counter += 1
    task = Task(
        id=_task_counter,
        title=payload.title,
        deadline=payload.deadline,
        created_at=datetime.utcnow(),
    )
    tasks[email].append(task.model_dump())
    return task


@app.get("/tasks", response_model=list[Task])
def list_tasks(email: Annotated[str, Depends(authenticate)]) -> list[Task]:
    return [Task(**t) for t in tasks[email]]


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, email: Annotated[str, Depends(authenticate)]) -> None:
    user_tasks = tasks[email]
    for i, t in enumerate(user_tasks):
        if t["id"] == task_id:
            del user_tasks[i]
            return
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
