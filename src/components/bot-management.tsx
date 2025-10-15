"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/app/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Bot,
  Play,
  Pause,
  Trash2,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface BotInstance {
  id: string;
  name: string;
  type: string;
  status: "idle" | "running" | "error" | "stopped";
  lastActivity: string | null;
  performance: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    successRate: number;
  };
  config: {
    headless: boolean;
    timeout: number;
    retryAttempts: number;
    delayBetweenActions: number;
  };
}

export function BotManagement() {
  const { user } = useAuth();
  const [bots, setBots] = useState<BotInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotInstance | null>(null);

  // Create bot form
  const [formData, setFormData] = useState({
    type: "",
    name: "",
    headless: true,
    timeout: 30000,
    retryAttempts: 3,
    delayBetweenActions: 2000,
    proxyId: "",
  });

  useEffect(() => {
    if (user) {
      loadBots();
    }
  }, [user]);

  const loadBots = async () => {
    if (!user) return;

    try {
      // This would typically come from your API
      // For now, we'll simulate with mock data
      const mockBots: BotInstance[] = [
        {
          id: "bot_1",
          name: "Dreamland Bot 1",
          type: "dreamland",
          status: "idle",
          lastActivity: new Date().toISOString(),
          performance: {
            totalTasks: 15,
            successfulTasks: 12,
            failedTasks: 3,
            successRate: 80,
          },
          config: {
            headless: true,
            timeout: 30000,
            retryAttempts: 3,
            delayBetweenActions: 2000,
          },
        },
        {
          id: "bot_2",
          name: "Mediamarkt Bot 1",
          type: "mediamarkt",
          status: "running",
          lastActivity: new Date().toISOString(),
          performance: {
            totalTasks: 8,
            successfulTasks: 6,
            failedTasks: 2,
            successRate: 75,
          },
          config: {
            headless: true,
            timeout: 30000,
            retryAttempts: 3,
            delayBetweenActions: 2000,
          },
        },
      ];

      setBots(mockBots);
    } catch (error) {
      console.error("Error loading bots:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // This would typically call your API to create a bot
      const newBot: BotInstance = {
        id: `bot_${Date.now()}`,
        name: formData.name || `${formData.type} Bot`,
        type: formData.type,
        status: "idle",
        lastActivity: new Date().toISOString(),
        performance: {
          totalTasks: 0,
          successfulTasks: 0,
          failedTasks: 0,
          successRate: 0,
        },
        config: {
          headless: formData.headless,
          timeout: formData.timeout,
          retryAttempts: formData.retryAttempts,
          delayBetweenActions: formData.delayBetweenActions,
        },
      };

      setBots((prev) => [...prev, newBot]);
      setFormData({
        type: "",
        name: "",
        headless: true,
        timeout: 30000,
        retryAttempts: 3,
        delayBetweenActions: 2000,
        proxyId: "",
      });
      setShowCreateDialog(false);
    } catch (error) {
      console.error("Error creating bot:", error);
    }
  };

  const handleStartBot = async (botId: string) => {
    try {
      setBots((prev) =>
        prev.map((bot) =>
          bot.id === botId ? { ...bot, status: "running" as const } : bot
        )
      );
    } catch (error) {
      console.error("Error starting bot:", error);
    }
  };

  const handleStopBot = async (botId: string) => {
    try {
      setBots((prev) =>
        prev.map((bot) =>
          bot.id === botId ? { ...bot, status: "stopped" as const } : bot
        )
      );
    } catch (error) {
      console.error("Error stopping bot:", error);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!confirm("Are you sure you want to delete this bot?")) return;

    try {
      setBots((prev) => prev.filter((bot) => bot.id !== botId));
    } catch (error) {
      console.error("Error deleting bot:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800";
      case "idle":
        return "bg-blue-100 text-blue-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "stopped":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Play className="h-4 w-4 text-green-600" />;
      case "idle":
        return <Pause className="h-4 w-4 text-blue-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "stopped":
        return <Pause className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading bots...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bot Management</h2>
          <p className="text-muted-foreground">
            Manage your automated bots for different stores
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Bot className="h-4 w-4 mr-2" />
              Create Bot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bot</DialogTitle>
              <DialogDescription>
                Create a new bot instance for automated purchases
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateBot} className="space-y-4">
              <div>
                <Label htmlFor="type">Store Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dreamland">Dreamland</SelectItem>
                    <SelectItem value="mediamarkt">Mediamarkt</SelectItem>
                    <SelectItem value="fnac">Fnac</SelectItem>
                    <SelectItem value="bol">Bol.com</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Bot Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="My Dreamland Bot"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="headless"
                  checked={formData.headless}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, headless: checked }))
                  }
                />
                <Label htmlFor="headless">Run in background (headless)</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={formData.timeout}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        timeout: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="retryAttempts">Retry Attempts</Label>
                  <Input
                    id="retryAttempts"
                    type="number"
                    value={formData.retryAttempts}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        retryAttempts: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Bot</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bot Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{bots.length}</div>
                <div className="text-sm text-muted-foreground">Total Bots</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {bots.filter((bot) => bot.status === "running").length}
                </div>
                <div className="text-sm text-muted-foreground">Active Bots</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {bots.reduce(
                    (sum, bot) => sum + bot.performance.successfulTasks,
                    0
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Successful Tasks
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">
                  {bots.length > 0
                    ? Math.round(
                        bots.reduce(
                          (sum, bot) => sum + bot.performance.successRate,
                          0
                        ) / bots.length
                      )
                    : 0}
                  %
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Success Rate
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bots Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bots.map((bot) => (
                <TableRow key={bot.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Bot className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{bot.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {bot.type} Bot
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(bot.status)}
                      <Badge className={getStatusColor(bot.status)}>
                        {bot.status.toUpperCase()}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">
                          {bot.performance.successRate}%
                        </span>{" "}
                        success rate
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bot.performance.successfulTasks}/
                        {bot.performance.totalTasks} tasks
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {bot.lastActivity
                        ? new Date(bot.lastActivity).toLocaleString()
                        : "Never"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {bot.status === "running" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStopBot(bot.id)}
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartBot(bot.id)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedBot(bot)}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteBot(bot.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {bots.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Bots</h3>
            <p className="text-muted-foreground mb-4">
              Create your first bot to start automating purchases
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Bot className="h-4 w-4 mr-2" />
              Create Your First Bot
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

