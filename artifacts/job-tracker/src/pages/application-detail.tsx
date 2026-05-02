import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { 
  useGetApplication,
  useUpdateApplication,
  useDeleteApplication,
  useAddApplicationNote,
  useCreateApplication,
  getGetApplicationQueryKey,
  getListApplicationsQueryKey,
  getGetApplicationStatsQueryKey,
  ApplicationStatus
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/status-badge";
import { ArrowLeft, Building2, MapPin, Globe, ExternalLink, Calendar, AlertTriangle, Save, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ApplicationDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isNew = !params.id || params.id === "new";

  const { data: app, isLoading } = useGetApplication(id, {
    query: { enabled: !isNew && !!id, queryKey: getGetApplicationQueryKey(id) }
  });

  const [noteContent, setNoteContent] = useState("");

  const updateApp = useUpdateApplication({
    mutation: {
      onSuccess: () => {
        toast({ title: "Application updated" });
        queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetApplicationStatsQueryKey() });
      }
    }
  });

  const deleteApp = useDeleteApplication({
    mutation: {
      onSuccess: () => {
        toast({ title: "Application deleted" });
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetApplicationStatsQueryKey() });
        setLocation("/applications");
      }
    }
  });

  const addNote = useAddApplicationNote({
    mutation: {
      onSuccess: () => {
        setNoteContent("");
        toast({ title: "Note added" });
        queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(id) });
      }
    }
  });

  const createApp = useCreateApplication({
    mutation: {
      onSuccess: (newApp) => {
        toast({ title: "Application created" });
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetApplicationStatsQueryKey() });
        setLocation(`/applications/${newApp.id}`);
      }
    }
  });

  const [formData, setFormData] = useState({
    company: "",
    role: "",
    status: ApplicationStatus.applied,
    location: "",
    source: "",
    url: ""
  });

  if (isNew) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="font-mono text-xs -ml-3" onClick={() => setLocation('/applications')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> CANCEL
          </Button>
        </div>
        <Card className="border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.05)]">
          <CardHeader>
            <CardTitle className="font-mono text-sm uppercase flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> NEW_APPLICATION_ENTRY
            </CardTitle>
            <CardDescription>Manually track a new job application.</CardDescription>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                createApp.mutate({
                  data: {
                    company: formData.company,
                    role: formData.role,
                    status: formData.status,
                    location: formData.location || undefined,
                    source: formData.source || undefined,
                    url: formData.url || undefined
                  }
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium text-muted-foreground">COMPANY *</label>
                  <Input 
                    required 
                    value={formData.company} 
                    onChange={e => setFormData({...formData, company: e.target.value})} 
                    className="font-mono text-sm bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium text-muted-foreground">ROLE *</label>
                  <Input 
                    required 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                    className="font-mono text-sm bg-secondary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium text-muted-foreground">STATUS</label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(val) => setFormData({...formData, status: val as ApplicationStatus})}
                  >
                    <SelectTrigger className="font-mono text-sm bg-secondary/50 uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ApplicationStatus).map(status => (
                        <SelectItem key={status} value={status} className="uppercase font-mono">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium text-muted-foreground">LOCATION</label>
                  <Input 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                    className="font-mono text-sm bg-secondary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium text-muted-foreground">SOURCE</label>
                  <Input 
                    value={formData.source} 
                    onChange={e => setFormData({...formData, source: e.target.value})} 
                    placeholder="e.g. LinkedIn, Referral"
                    className="font-mono text-sm bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono font-medium text-muted-foreground">URL</label>
                  <Input 
                    type="url"
                    value={formData.url} 
                    onChange={e => setFormData({...formData, url: e.target.value})} 
                    placeholder="https://..."
                    className="font-mono text-sm bg-secondary/50"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full font-mono" disabled={createApp.isPending || !formData.company || !formData.role}>
                  {createApp.isPending ? "INITIALIZING..." : "SAVE_APPLICATION_RECORD"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="space-y-4 p-6"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!app) return <div>Not found</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="font-mono text-xs -ml-3" onClick={() => setLocation('/applications')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> BACK_TO_LIST
        </Button>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="font-mono text-xs h-8">
                <Trash2 className="h-4 w-4 mr-2" /> DELETE
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this application record.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteApp.mutate({ id })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {app.isScam && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex gap-3 items-start text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold font-mono">SCAM_FLAG_DETECTED</h3>
            <p className="text-sm mt-1">{app.scamReason || "Flagged as potential scam or low quality."}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{app.company}</h1>
                  <p className="text-xl text-muted-foreground">{app.role}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Select 
                    value={app.status} 
                    onValueChange={(val) => updateApp.mutate({ id, data: { status: val as ApplicationStatus }})}
                  >
                    <SelectTrigger className="w-40 font-mono font-bold uppercase h-10 border-primary/50 text-primary bg-primary/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ApplicationStatus).map(status => (
                        <SelectItem key={status} value={status} className="uppercase font-mono">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm border-t border-border pt-6">
                {app.location && (
                  <div>
                    <p className="text-muted-foreground font-mono text-xs uppercase mb-1 flex items-center gap-1"><MapPin className="h-3 w-3"/> Location</p>
                    <p className="font-medium">{app.location}</p>
                  </div>
                )}
                {app.source && (
                  <div>
                    <p className="text-muted-foreground font-mono text-xs uppercase mb-1 flex items-center gap-1"><Globe className="h-3 w-3"/> Source</p>
                    <p className="font-medium">{app.source}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground font-mono text-xs uppercase mb-1 flex items-center gap-1"><Calendar className="h-3 w-3"/> Applied On</p>
                  <p className="font-medium">{format(new Date(app.appliedAt), 'PP')}</p>
                </div>
                {app.url && (
                  <div>
                    <p className="text-muted-foreground font-mono text-xs uppercase mb-1 flex items-center gap-1"><ExternalLink className="h-3 w-3"/> Link</p>
                    <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                      {app.url}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="font-mono text-sm uppercase">Notes & Updates</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-2">
                <Textarea 
                  placeholder="Add a new update or note..." 
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="font-mono text-sm min-h-[80px] bg-secondary/30"
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  size="sm" 
                  onClick={() => addNote.mutate({ id, data: { notes: noteContent } })}
                  disabled={!noteContent.trim() || addNote.isPending}
                  className="font-mono text-xs"
                >
                  <Save className="h-4 w-4 mr-2" /> COMMIT_LOG
                </Button>
              </div>

              {app.notes ? (
                <div className="mt-8 pt-6 border-t border-border/50 whitespace-pre-wrap font-mono text-sm text-foreground/90 bg-card p-4 rounded border border-border/20 shadow-sm leading-relaxed">
                  {app.notes}
                </div>
              ) : (
                <div className="mt-8 pt-6 text-center text-muted-foreground font-mono text-xs uppercase opacity-50">
                  NO_LOGS_AVAILABLE
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="font-mono text-sm uppercase">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-primary bg-background text-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_10px_var(--color-primary)] z-10">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  </div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-primary/20 bg-primary/5 shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-primary text-xs font-mono uppercase">LATEST_{app.status}</div>
                      <time className="font-mono text-[10px] text-muted-foreground">{format(new Date(app.updatedAt), 'MM/dd/yy')}</time>
                    </div>
                    <div className="text-xs text-foreground/80 opacity-80">Status transitioned</div>
                  </div>
                </div>
                
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-border bg-background text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  </div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-border bg-card shadow-sm opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-foreground text-xs font-mono uppercase">INITIAL_ENTRY</div>
                      <time className="font-mono text-[10px] text-muted-foreground">{format(new Date(app.appliedAt), 'MM/dd/yy')}</time>
                    </div>
                    <div className="text-xs text-muted-foreground">Application submitted</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}