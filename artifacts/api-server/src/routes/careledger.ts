import { Router, type IRouter } from "express";
import {
  CreatePersonBody,
  CreateTaskBody,
  GetDashboardResponse,
  ListDocumentsResponse,
  ListPeopleResponse,
  ListTasksResponse,
  UpdatePersonBody,
  UpdatePersonParams,
  UpdateTaskBody,
  UpdateTaskParams,
} from "@workspace/api-zod";

type Person = {
  id: number;
  name: string;
  relationship: string;
  age: number;
  planStatus: "on-track" | "needs-attention" | "getting-started";
  initials: string;
  accent: string;
};

type Task = {
  id: number;
  title: string;
  category: string;
  dueLabel: string;
  status: "todo" | "in-progress" | "done";
  priority: "high" | "medium" | "low";
};

const people: Person[] = [
  { id: 1, name: "Maya Thompson", relationship: "My daughter", age: 24, planStatus: "on-track", initials: "MT", accent: "coral" },
  { id: 2, name: "Eli Thompson", relationship: "My son", age: 19, planStatus: "getting-started", initials: "ET", accent: "lavender" },
];

const tasks: Task[] = [
  { id: 1, title: "Review Maya's ABLE account contribution", category: "Benefits", dueLabel: "Due today", status: "in-progress", priority: "high" },
  { id: 2, title: "Gather updated letter of intent notes", category: "Future planning", dueLabel: "Due Aug 28", status: "todo", priority: "medium" },
  { id: 3, title: "Confirm representative payee details", category: "Documents", dueLabel: "Due Sep 02", status: "todo", priority: "medium" },
  { id: 4, title: "Add emergency contact to care circle", category: "Care circle", dueLabel: "Completed Aug 18", status: "done", priority: "low" },
];

const documents = [
  { id: 1, name: "Letter of intent", type: "Future planning", updatedLabel: "Updated 2 days ago", status: "review" as const },
  { id: 2, name: "ABLE account statement", type: "Benefits", updatedLabel: "Updated Aug 16", status: "ready" as const },
  { id: 3, name: "Healthcare proxy", type: "Legal", updatedLabel: "Needs an update", status: "missing" as const },
];

const initialsFor = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const dashboard = () =>
  GetDashboardResponse.parse({
    person: people[0],
    progress: 68,
    completedTasks: tasks.filter((task) => task.status === "done").length,
    totalTasks: tasks.length,
    benefits: [
      { name: "SSI", status: "protected", note: "Monthly income is within the current plan." },
      { name: "Medicaid", status: "protected", note: "No action needed this month." },
      { name: "ABLE account", status: "review", note: "Contribution review due today." },
    ],
    netWorth: 84200,
    monthlySupport: 1840,
    recentActivity: [
      { id: 1, label: "Healthcare proxy marked for review", timeLabel: "Yesterday", tone: "amber" },
      { id: 2, label: "Emergency contact added to care circle", timeLabel: "Aug 18", tone: "green" },
      { id: 3, label: "ABLE account statement uploaded", timeLabel: "Aug 16", tone: "blue" },
    ],
  });

const router: IRouter = Router();

router.get("/dashboard", (_req, res): void => {
  res.json(dashboard());
});

router.get("/people", (_req, res): void => {
  res.json(ListPeopleResponse.parse(people));
});

router.post("/people", (req, res): void => {
  const parsed = CreatePersonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const person: Person = {
    id: people.length + 1,
    ...parsed.data,
    planStatus: "getting-started",
    initials: initialsFor(parsed.data.name),
    accent: "sage",
  };
  people.push(person);
  res.status(201).json(person);
});

router.patch("/people/:id", (req, res): void => {
  const params = UpdatePersonParams.safeParse(req.params);
  const parsed = UpdatePersonBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid person update" });
    return;
  }
  const person = people.find((item) => item.id === params.data.id);
  if (!person) {
    res.status(404).json({ error: "Person not found" });
    return;
  }
  Object.assign(person, parsed.data);
  if (parsed.data.name) person.initials = initialsFor(parsed.data.name);
  res.json(person);
});

router.get("/tasks", (_req, res): void => {
  res.json(ListTasksResponse.parse(tasks));
});

router.post("/tasks", (req, res): void => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const task: Task = {
    id: tasks.length + 1,
    title: parsed.data.title,
    category: parsed.data.category,
    dueLabel: parsed.data.dueLabel ?? "No due date",
    priority: parsed.data.priority ?? "medium",
    status: "todo",
  };
  tasks.push(task);
  res.status(201).json(task);
});

router.patch("/tasks/:id", (req, res): void => {
  const params = UpdateTaskParams.safeParse(req.params);
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid task update" });
    return;
  }
  const task = tasks.find((item) => item.id === params.data.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  Object.assign(task, parsed.data);
  res.json(task);
});

router.get("/documents", (_req, res): void => {
  res.json(ListDocumentsResponse.parse(documents));
});

export default router;