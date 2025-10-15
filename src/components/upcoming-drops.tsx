"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock } from "lucide-react"
import Image from "next/image"

const drops = [
  {
    id: "1",
    name: "Jordan 1 High 'Chicago'",
    brand: "Nike",
    releaseDate: "2024-01-15",
    releaseTime: "10:00 AM EST",
    price: "$170",
    image: "/placeholder.svg?height=80&width=80",
    priority: "high",
  },
  {
    id: "2",
    name: "Yeezy Boost 700 'Wave Runner'",
    brand: "Adidas",
    releaseDate: "2024-01-18",
    releaseTime: "9:00 AM EST",
    price: "$300",
    image: "/placeholder.svg?height=80&width=80",
    priority: "medium",
  },
  {
    id: "3",
    name: "Dunk Low 'University Blue'",
    brand: "Nike",
    releaseDate: "2024-01-20",
    releaseTime: "10:00 AM EST",
    price: "$100",
    image: "/placeholder.svg?height=80&width=80",
    priority: "low",
  },
]

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "high":
      return <Badge variant="destructive">High</Badge>
    case "medium":
      return <Badge variant="default">Medium</Badge>
    case "low":
      return <Badge variant="secondary">Low</Badge>
    default:
      return <Badge variant="outline">{priority}</Badge>
  }
}

export function UpcomingDrops() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Drops</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {drops.map((drop) => (
            <div key={drop.id} className="flex items-center space-x-4 rounded-lg border p-4">
              <Image
                src={drop.image || "/placeholder.svg"}
                alt={drop.name}
                width={80}
                height={80}
                className="rounded-md object-cover"
              />
              <div className="flex-1 space-y-1">
                <h4 className="font-medium">{drop.name}</h4>
                <p className="text-sm text-muted-foreground">{drop.brand}</p>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{drop.releaseDate}</span>
                  <Clock className="h-4 w-4" />
                  <span>{drop.releaseTime}</span>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <span className="font-medium">{drop.price}</span>
                {getPriorityBadge(drop.priority)}
                <Button size="sm">Set Task</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
