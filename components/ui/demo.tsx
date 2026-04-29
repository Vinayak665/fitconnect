"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

export function Calendar20() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date()
  )
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null)
  
  const timeSlots = Array.from({ length: 37 }, (_, i) => {
    const totalMinutes = i * 15
    const hour = Math.floor(totalMinutes / 60) + 9
    const minute = totalMinutes % 60
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
  })

  // Sample booked dates
  const bookedDates = [
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 2),
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 3),
  ]

  return (
    <Card className="gap-0 p-0 shadow-none border-0">
      <CardContent className="relative p-0 md:pr-48">
        <div className="p-6">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            defaultMonth={date}
            disabled={bookedDates}
            showOutsideDays={false}
            modifiers={{
              booked: bookedDates,
            }}
            modifiersClassNames={{
              booked: "[&>button]:line-through opacity-100 font-bold text-red-500",
            }}
            className="bg-transparent p-0 [--cell-size:3rem] md:[--cell-size:3.5rem]"
          />
        </div>
        <div className="no-scrollbar inset-y-0 right-0 flex max-h-72 w-full scroll-pb-6 flex-col gap-4 overflow-y-auto border-t p-6 md:absolute md:max-h-none md:w-48 md:border-t-0 md:border-l">
          <div className="grid gap-2">
             <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">
                Available Time
             </div>
            {timeSlots.map((time) => (
              <Button
                key={time}
                variant={selectedTime === time ? "default" : "outline"}
                onClick={() => setSelectedTime(time)}
                className="w-full shadow-none text-xs h-10"
              >
                {time}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t px-6 !py-5 md:flex-row">
        <div className="text-sm">
          {date && selectedTime ? (
            <>
              Your session is booked for{" "}
              <span className="font-medium">
                {" "}
                {date?.toLocaleDateString("en-US", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}{" "}
              </span>
              at <span className="font-medium text-[#3498db]">{selectedTime}</span>.
            </>
          ) : (
            <>Select a date and time for your session.</>
          )}
        </div>
        <Button
          disabled={!date || !selectedTime}
          className="w-full md:ml-auto md:w-auto bg-[#3498db] hover:bg-[#2980b9]"
          variant="default"
        >
          Confirm
        </Button>
      </CardFooter>
    </Card>
  )
}
