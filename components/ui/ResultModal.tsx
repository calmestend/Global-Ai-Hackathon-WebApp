"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X } from "lucide-react";

interface ResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: string;
}

export function ResultModal({ open, onOpenChange, result }: ResultModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="text-green-500 w-14 h-14 animate-bounce" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-green-700">Workout Result</DialogTitle>
          </DialogHeader>
          <p className="text-lg text-gray-700 font-medium min-h-[48px]">
            {result || "No result provided"}
          </p>
          <Button
            variant="outline"
            className="mt-4 w-full rounded-full text-base font-semibold"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5 mr-2" /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
