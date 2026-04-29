"use client"

import * as React from "react"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Card, CardContent, CardFooter } from "./card"

export function BookingCalendar({ onSelect }) {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null)

  const timeSlots = Array.from({ length: 37 }, (_, i) => {
    const totalMinutes = i * 15
    const hour = Math.floor(totalMinutes / 60) + 9
    const minute = totalMinutes % 60
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
  })

  // Static booked dates for now
  const bookedDates = [
    new Date(2025, 5, 17),
    new Date(2025, 5, 18),
    new Date(2025, 5, 19),
  ]

  React.useEffect(() => {
    if (date && selectedTime) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      onSelect(`${year}-${month}-${day}T${selectedTime}`)
    }
  }, [date, selectedTime, onSelect])

  return (
    <Card className="gap-0 p-0 border-0 shadow-none bg-transparent">
      <CardContent className="relative p-0 md:pr-48 flex flex-col md:flex-row">
        <div className="p-0 flex-grow">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="bg-transparent p-0"
            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
          />
        </div>
        <div className="no-scrollbar flex max-h-72 w-full flex-col gap-2 overflow-y-auto border-t p-4 md:absolute md:top-0 md:bottom-0 md:right-0 md:max-h-none md:w-48 md:border-t-0 md:border-l bg-white/50 backdrop-blur-sm">
          <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Available Slots</div>
          <div className="grid gap-2">
            {timeSlots.map((time) => (
              <Button
                key={time}
                type="button"
                variant={selectedTime === time ? "default" : "outline"}
                onClick={() => setSelectedTime(time)}
                className="w-full shadow-none text-sm h-10"
              >
                {time}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t px-0 !py-5 mt-4 md:flex-row items-center">
        <div className="text-sm text-neutral-600">
          {date && selectedTime ? (
            <>
              Selected: <span className="font-bold text-primary">
                {date.toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span> at <span className="font-bold text-primary">{selectedTime}</span>
            </>
          ) : (
            <span className="italic">Select a date and time slot</span>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
