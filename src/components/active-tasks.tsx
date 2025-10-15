"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Play, Square } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Task = {
  id: string;
  product_id: string;
  store_account_id: string;
  proxy_id?: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  priority: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  product?: {
    name: string;
    url: string;
    current_price: number;
    store: {
      name: string;
    };
  };
  store_account?: {
    username: string;
    store: {
      name: string;
    };
  };
  proxy?: {
    host: string;
    port: number;
  };
};

export function ActiveTasks({
  tasks,
  reloadTasks,
}: {
  tasks: Task[];
  reloadTasks: () => void;
}) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "queued":
        return <Badge variant="secondary">Queued</Badge>;
      case "running":
        return (
          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
            Running
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
            Failed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-gray-500 hover:bg-gray-600">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No active tasks found.</p>
            <p className="text-sm">Create a new task to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    {task.product?.name || "Unknown Product"}
                  </TableCell>
                  <TableCell>
                    {task.product?.store?.name || "Unknown Store"}
                  </TableCell>
                  <TableCell>
                    {task.store_account?.username || "Unknown Account"}
                  </TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={task.priority > 0 ? "default" : "secondary"}
                    >
                      {task.priority === 0
                        ? "Normal"
                        : task.priority === 1
                        ? "High"
                        : "Critical"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(task.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {task.status === "queued" && (
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/tasks/${task.id}/start`,
                                  {
                                    method: "POST",
                                  }
                                );
                                if (response.ok) {
                                  reloadTasks();
                                }
                              } catch (error) {
                                console.error("Error starting task:", error);
                              }
                            }}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Start
                          </DropdownMenuItem>
                        )}
                        {(task.status === "running" ||
                          task.status === "queued") && (
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/tasks/${task.id}/stop`,
                                  {
                                    method: "POST",
                                  }
                                );
                                if (response.ok) {
                                  reloadTasks();
                                }
                              } catch (error) {
                                console.error("Error stopping task:", error);
                              }
                            }}
                          >
                            <Square className="mr-2 h-4 w-4" />
                            Stop
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `/api/tasks/${task.id}`,
                                {
                                  method: "DELETE",
                                }
                              );
                              if (response.ok) {
                                reloadTasks();
                              }
                            } catch (error) {
                              console.error("Error deleting task:", error);
                            }
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
