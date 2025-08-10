"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User2 } from "lucide-react";

interface WorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userAge: number | null;
  userWeight: string | null;
  userHeight: string | null;
  userSex: string | null;
}

export function WorkoutModal({ open, onOpenChange, userAge, userWeight, userHeight, userSex }: WorkoutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <User2 className="text-blue-500 w-14 h-14" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-700">User Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-lg text-gray-700 font-medium min-h-[120px]">
            <p>Age: <span className="font-semibold">{userAge ?? "Not provided"}</span></p>
            <p>Weight: <span className="font-semibold">{userWeight ?? "Not provided"}</span></p>
            <p>Height: <span className="font-semibold">{userHeight ?? "Not provided"}</span></p>
            <p>Sex: <span className="font-semibold capitalize">{userSex ?? "Not provided"}</span></p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
