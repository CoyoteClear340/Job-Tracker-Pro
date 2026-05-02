import React from "react";

type ApplicationStatus = "applied" | "interview" | "offer" | "rejected" | "ghosted";

export function StatusBadge({ status, className = "" }: { status: ApplicationStatus; className?: string }) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case "offer":
        return "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30";
      case "interview":
        return "bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30";
      case "applied":
        return "bg-primary/20 text-primary border-primary/30";
      case "rejected":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "ghosted":
        return "bg-muted text-muted-foreground border-muted-foreground/30";
      default:
        return "bg-secondary text-secondary-foreground border-border";
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium border uppercase tracking-wider ${getStatusColor(status)} ${className}`}>
      {status}
    </span>
  );
}
