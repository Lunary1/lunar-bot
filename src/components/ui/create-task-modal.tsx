"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useState } from "react";

type TaskInput = {
  product: string;
  site: string;
  size: string;
  proxy: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (task: TaskInput) => void;
};

export function CreateTaskModal({ open, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<TaskInput>({
    product: "",
    site: "Pokémon Center",
    size: "9",
    proxy: "Default",
  });

  const handleChange = (key: keyof TaskInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!form.product) {
      alert("Product name is required.");
      return;
    }

    onSubmit(form);
    onClose();
    setForm({
      product: "",
      site: "Pokémon Center",
      size: "9",
      proxy: "Default",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="product">Product</Label>
            <Input
              id="product"
              placeholder="E.g. Crown Zenith ETB"
              value={form.product}
              onChange={(e) => handleChange("product", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Site</Label>
            <Input value="Pokémon Center" readOnly disabled />
          </div>

          <div className="space-y-1">
            <Label>Size</Label>
            <Select
              value={form.size}
              onValueChange={(val) => handleChange("size", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {["6", "7", "8", "9", "10", "10.5", "11", "12", "13"].map(
                  (size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Proxy Group</Label>
            <Select
              value={form.proxy}
              onValueChange={(val) => handleChange("proxy", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select proxy group" />
              </SelectTrigger>
              <SelectContent>
                {["Default", "ISP", "Residential"].map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} className="w-full mt-2">
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
