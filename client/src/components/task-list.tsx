import { useState } from "react";
import { Plus, Check, Trash2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Task } from "@shared/schema";

interface TaskListProps {
  tasks: Task[];
  currentTaskId: string | null;
  onAddTask: (title: string, estimatedPomodoros: number) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSelectTask: (id: string) => void;
}

export function TaskList({
  tasks,
  currentTaskId,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: TaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPomodoros, setNewTaskPomodoros] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle.trim(), newTaskPomodoros);
      setNewTaskTitle("");
      setNewTaskPomodoros(1);
    }
  };

  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="neo-inset rounded-2xl p-4 flex flex-col gap-4">
          <Input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="What are you working on?"
            data-testid="input-task-title"
            className="w-full bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 text-lg h-auto py-2"
          />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Pomodoros:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant="ghost"
                    onClick={() => setNewTaskPomodoros(num)}
                    data-testid={`button-pomodoros-${num}`}
                    className={`w-8 h-8 rounded-lg text-sm font-medium p-0 ${
                      newTaskPomodoros === num
                        ? "neo-pressed text-primary"
                        : "neo-button-sm"
                    }`}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              type="submit"
              variant="ghost"
              data-testid="button-add-task"
              className="neo-button px-6 py-2 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {incompleteTasks.length === 0 && completedTasks.length === 0 && (
          <div className="neo-inset rounded-2xl p-8 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">No tasks yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add a task to get started</p>
          </div>
        )}

        {incompleteTasks.map((task) => (
          <div
            key={task.id}
            className={`neo-card rounded-2xl p-4 transition-all group ${
              currentTaskId === task.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <Button
                onClick={() => onToggleTask(task.id)}
                variant="ghost"
                size="icon"
                data-testid={`button-toggle-task-${task.id}`}
                className="neo-button-sm w-6 h-6 rounded-lg flex-shrink-0 mt-0.5 p-0"
              >
                {task.completed && <Check className="w-4 h-4 text-primary" />}
              </Button>
              
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onSelectTask(task.id)}
                  data-testid={`button-select-task-${task.id}`}
                  className="text-left w-full"
                >
                  <p className="text-foreground font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: task.estimatedPomodoros }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < task.completedPomodoros ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {task.completedPomodoros}/{task.estimatedPomodoros}
                    </span>
                  </div>
                </button>
              </div>
              
              <Button
                onClick={() => onDeleteTask(task.id)}
                variant="ghost"
                size="icon"
                data-testid={`button-delete-task-${task.id}`}
                className="neo-button-sm p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}

        {completedTasks.length > 0 && (
          <div className="pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Completed ({completedTasks.length})
            </h3>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="neo-inset rounded-xl p-3 opacity-60 group"
                >
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => onToggleTask(task.id)}
                      variant="ghost"
                      size="icon"
                      data-testid={`button-toggle-task-${task.id}`}
                      className="neo-pressed w-6 h-6 rounded-lg flex-shrink-0 p-0"
                    >
                      <Check className="w-4 h-4 text-primary" />
                    </Button>
                    <span className="text-foreground line-through flex-1 truncate">{task.title}</span>
                    <Button
                      onClick={() => onDeleteTask(task.id)}
                      variant="ghost"
                      size="icon"
                      data-testid={`button-delete-task-${task.id}`}
                      className="p-1 h-6 w-6"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
