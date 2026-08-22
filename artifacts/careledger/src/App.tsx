import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Home,
  Landmark,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import {
  getGetDashboardQueryKey,
  getListPeopleQueryKey,
  getListTasksQueryKey,
  useCreatePerson,
  useCreateTask,
  useGetDashboard,
  useListDocuments,
  useListPeople,
  useListTasks,
  useUpdatePerson,
  useUpdateTask,
} from '@workspace/api-client-react';
import type { Benefit, Document, Person, Task, TaskStatus } from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();

const navItems = [
  { href: '/', label: 'Overview', icon: Home },
  { href: '/people', label: 'People', icon: UsersRound },
  { href: '/tasks', label: 'Tasks', icon: ClipboardCheck },
  { href: '/documents', label: 'Documents', icon: FileText },
];

const formatMoney = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    : '—';

function Avatar({ initials, accent, size = 'md' }: { initials: string; accent?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-8 w-8 text-[11px]', md: 'h-11 w-11 text-sm', lg: 'h-[76px] w-[76px] text-2xl' };
  return (
    <div
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full font-semibold text-[#173937] ring-4 ring-[#173937]/[.06]`}
      style={{ backgroundColor: accent || '#f5b84f' }}
      data-testid={`avatar-${initials}`}
    >
      {initials}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'on-track': 'bg-[#dceee1] text-[#276345]',
    'needs-attention': 'bg-[#fae0d7] text-[#9b4939]',
    'getting-started': 'bg-[#f8e8bc] text-[#765718]',
    protected: 'bg-[#dceee1] text-[#276345]',
    review: 'bg-[#f8e8bc] text-[#765718]',
    incomplete: 'bg-[#fae0d7] text-[#9b4939]',
    ready: 'bg-[#dceee1] text-[#276345]',
    missing: 'bg-[#fae0d7] text-[#9b4939]',
    todo: 'bg-[#ece9df] text-[#53615b]',
    'in-progress': 'bg-[#dce8ed] text-[#3c6370]',
    done: 'bg-[#dceee1] text-[#276345]',
    high: 'bg-[#fae0d7] text-[#9b4939]',
    medium: 'bg-[#f8e8bc] text-[#765718]',
    low: 'bg-[#ece9df] text-[#53615b]',
  };
  const labels: Record<string, string> = {
    'on-track': 'On track',
    'needs-attention': 'Needs attention',
    'getting-started': 'Getting started',
    protected: 'Protected',
    review: 'Review soon',
    incomplete: 'Incomplete',
    ready: 'Ready',
    missing: 'Missing',
    todo: 'To do',
    'in-progress': 'In progress',
    done: 'Done',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${styles[status] || styles.low}`} data-testid={`status-${status}`}>
      {labels[status] || status}
    </span>
  );
}

function LoadingState({ label = 'Gathering your plan' }: { label?: string }) {
  return (
    <div className="space-y-5" aria-label="Loading">
      <div className="h-7 w-56 animate-pulse rounded-lg bg-[#e6e1d5]" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-[#ece8dd]" />)}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-[#ece8dd]" />
      <p className="text-sm text-[#68766e]" data-testid="status-loading">{label}…</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-[#e9b5a5] bg-[#fff5f0] p-8 text-center" role="alert">
      <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-[#a35141]" />
      <h2 className="serif text-2xl text-[#173937]">We hit a quiet patch</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#68766e]">Your plan is safe. We could not bring the latest view in just now.</p>
      <button onClick={onRetry} className="mt-5 rounded-full bg-[#173937] px-5 py-2.5 text-sm font-semibold text-[#fffaf1] hover:-translate-y-0.5" data-testid="button-retry">Try again</button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, copy, action }: { icon: typeof FileText; title: string; copy: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d7d1c2] bg-[#fbf8f0] px-6 text-center">
      <div className="mb-4 rounded-2xl bg-[#f5e4b8] p-4 text-[#765718]"><Icon className="h-7 w-7" /></div>
      <h2 className="serif text-2xl text-[#173937]">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#68766e]">{copy}</p>
      {action}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = navItems.find((item) => item.href === location)?.label || (location === '/settings' ? 'Settings' : 'Overview');
  return (
     <div className="grain min-h-[100dvh] bg-[#f5f2ea] text-[#173937]">
       <a href="#main-content" className="absolute left-3 top-3 z-50 -translate-y-24 rounded-lg bg-[#f5b84f] px-4 py-2 text-sm font-bold text-[#173937] transition-transform focus:translate-y-0">Skip to main content</a>
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-[252px] flex-col bg-[#173937] px-5 py-6 text-[#f9f5e9] transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)} data-testid="link-brand">
             <div className="soleil-mark" aria-hidden="true"><span>s</span></div>
             <div><div className="serif text-[22px] leading-none tracking-[-.02em]">Soleil</div><div className="mt-1 text-[9px] font-semibold uppercase tracking-[.2em] text-[#adc4b5]">Plan with room to breathe</div></div>
          </Link>
          <button className="rounded-lg p-2 text-[#adc4b5] hover:bg-[#28504c] lg:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-navigation" aria-label="Close navigation"><X className="h-5 w-5" /></button>
        </div>
         <div className="mt-12 px-3 text-[10px] font-bold uppercase tracking-[.22em] text-[#86a99a]">Your Soleil workspace</div>
        <nav className="mt-3 space-y-1" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
             return <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${active ? 'bg-[#f5b84f] text-[#173937]' : 'text-[#d4e2d8] hover:bg-[#28504c]'}`} data-testid={`link-nav-${label.toLowerCase()}`}>
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-[#173937]' : 'text-[#9fbdad]'}`} /> {label}
              {label === 'Tasks' && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-[#173937] text-[#f5b84f]' : 'bg-[#28504c] text-[#d4e2d8]'}`}>4</span>}
            </Link>;
          })}
        </nav>
        <div className="mt-auto">
          <Link href="/settings" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${location === '/settings' ? 'bg-[#28504c] text-[#f9f5e9]' : 'text-[#d4e2d8] hover:bg-[#28504c]'}`} data-testid="link-nav-settings"><Settings2 className="h-[18px] w-[18px] text-[#9fbdad]" /> Settings</Link>
          <div className="mt-5 rounded-2xl border border-[#32615a] bg-[#214744] p-4">
             <div className="mb-3 flex items-center justify-between"><Sparkles className="h-4 w-4 text-[#f5b84f]" /><span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#86a99a]">A Soleil note</span></div>
             <p className="text-sm leading-5 text-[#e4eee4]">Small steps still move a plan forward.</p>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-[#32615a] pt-5">
             <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0c9a6] text-xs font-bold text-[#173937]">JR</div>
              <div className="min-w-0"><div className="truncate text-sm font-semibold">Maya Collins</div><div className="text-xs text-[#86a99a]">Plan coordinator</div></div>
            <ChevronDown className="ml-auto h-4 w-4 text-[#86a99a]" />
          </div>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-20 bg-[#173937]/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" data-testid="button-navigation-overlay" />}
       <main id="main-content" tabIndex={-1} className="min-h-[100dvh] lg:pl-[252px]">
        <header className="flex h-[76px] items-center justify-between border-b border-[#e5dfd1] bg-[#f8f5ee]/90 px-5 backdrop-blur-md sm:px-8 lg:px-12">
          <div className="flex items-center gap-3"><button className="rounded-xl p-2 hover:bg-[#ebe6da] lg:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-navigation" aria-label="Open navigation"><Menu className="h-5 w-5" /></button><span className="text-sm font-semibold text-[#68766e]">{current}</span></div>
         <div className="flex items-center gap-2 sm:gap-4"><button className="relative rounded-xl p-2.5 text-[#68766e] hover:bg-[#ebe6da] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8765f] focus-visible:ring-offset-2" aria-label="Notifications" data-testid="button-notifications"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#d8765f]" /></button><div className="hidden h-7 w-px bg-[#ded8ca] sm:block" /><div className="flex items-center gap-2 text-sm font-semibold"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0c9a6] text-[10px] font-bold">MC</div><span className="hidden sm:inline">Maya</span></div></div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

function PageIntro({ eyebrow, title, copy, action }: { eyebrow: string; title: ReactNode; copy: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#a1644e]"><span className="h-1.5 w-1.5 rounded-full bg-[#d8765f]" />{eyebrow}</div><h1 className="serif text-[clamp(2.25rem,4vw,3.5rem)] leading-[.98] tracking-[-.04em] text-[#173937]" data-testid="text-page-title">{title}</h1><p className="mt-3 max-w-xl text-[15px] leading-6 text-[#68766e]">{copy}</p></div>{action}</div>;
}

function Overview() {
  const [, setLocation] = useLocation();
  const dashboardQuery = useGetDashboard();
  const dashboard = dashboardQuery.data;
  if (dashboardQuery.isLoading) return <LoadingState />;
  if (dashboardQuery.isError || !dashboard) return <ErrorState onRetry={() => dashboardQuery.refetch()} />;
  const progressWidth = `${Math.max(0, Math.min(100, dashboard.progress))}%`;
  return (
    <div className="space-y-8">
      <PageIntro eyebrow="Good morning, Maya" title={<>A little more clarity,<br /><em className="not-italic text-[#a1644e]">one step at a time.</em></>} copy="Here is the clearest view of Maya's plan today. You are carrying a lot — this is a place to set some of it down." action={<button className="flex w-fit items-center gap-2 rounded-full bg-[#173937] px-5 py-3 text-sm font-semibold text-[#fffaf1] shadow-[0_6px_14px_rgba(23,57,55,.12)] hover:-translate-y-0.5" onClick={() => setLocation('/tasks')} data-testid="button-quick-add-task"><Plus className="h-4 w-4" /> Add a planning step</button>} />
      <section className="relative overflow-hidden rounded-[26px] bg-[#173937] p-6 text-[#f9f5e9] shadow-[0_14px_30px_rgba(23,57,55,.14)] sm:p-8">
        <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full border-[40px] border-[#f5b84f]/[.12]" /><div className="absolute -bottom-20 right-28 h-44 w-44 rounded-full border-[26px] border-[#d8765f]/[.12]" />
        <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4"><Avatar initials={dashboard.person.initials} accent={dashboard.person.accent} size="lg" /><div><div className="text-xs font-bold uppercase tracking-[.16em] text-[#98b5a6]">Active care plan</div><h2 className="serif mt-1 text-3xl">{dashboard.person.name}</h2><div className="mt-1 text-sm text-[#b9d0c0]">{dashboard.person.relationship} · age {dashboard.person.age}</div></div></div>
          <div className="flex w-full max-w-[340px] items-center gap-5 md:w-auto"><div className="relative h-[116px] w-[116px] shrink-0 rounded-full p-[9px]" style={{ background: `conic-gradient(#f5b84f ${dashboard.progress * 3.6}deg, #31534f 0)` }}><div className="flex h-full w-full items-center justify-center rounded-full bg-[#173937]"><span className="serif text-3xl" data-testid="text-plan-progress">{dashboard.progress}%</span></div></div><div><div className="text-sm font-semibold">Plan momentum</div><p className="mt-1 text-sm leading-5 text-[#b9d0c0]">{dashboard.completedTasks} of {dashboard.totalTasks} steps are in place.</p><div className="mt-3"><StatusPill status={dashboard.person.planStatus} /></div></div></div>
        </div>
        <div className="relative mt-8 border-t border-[#3c5b56] pt-5"><div className="flex items-center justify-between text-xs text-[#aac3b4]"><span>Plan progress</span><span>{dashboard.totalTasks - dashboard.completedTasks} steps to go</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#31534f]"><div className="animate-draw h-full rounded-full bg-[#f5b84f]" style={{ '--progress-width': progressWidth, width: progressWidth } as CSSProperties} /></div></div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={CircleDollarSign} label="Net worth snapshot" value={formatMoney(dashboard.netWorth)} note="Across tracked accounts" accent="gold" />
        <MetricCard icon={Landmark} label="Monthly support" value={formatMoney(dashboard.monthlySupport)} note="Benefits + regular support" accent="coral" />
        <MetricCard icon={Target} label="Next best step" value={`${dashboard.totalTasks - dashboard.completedTasks}`} note="Actions waiting for you" accent="sage" />
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.18fr_.82fr]">
        <BenefitsCard benefits={dashboard.benefits} />
        <ActivityCard activities={dashboard.recentActivity} />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, note, accent }: { icon: typeof CircleDollarSign; label: string; value: string; note: string; accent: 'gold' | 'coral' | 'sage' }) {
  const color = { gold: 'bg-[#f5e4b8] text-[#765718]', coral: 'bg-[#f3d5c6] text-[#a1644e]', sage: 'bg-[#dceee1] text-[#276345]' }[accent];
  return <div className="rounded-2xl border border-[#e5dfd1] bg-[#fbf9f3] p-5 shadow-[0_3px_12px_rgba(23,57,55,.035)] transition-transform hover:-translate-y-1"><div className={`mb-6 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></div><div className="text-xs font-semibold uppercase tracking-[.12em] text-[#8a948b]">{label}</div><div className="mt-1 text-2xl font-semibold tracking-[-.03em]" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</div><div className="mt-1 text-xs text-[#68766e]">{note}</div></div>;
}

function BenefitsCard({ benefits }: { benefits: Benefit[] }) {
  return <section className="rounded-2xl border border-[#e5dfd1] bg-[#fbf9f3] p-5 sm:p-6"><div className="flex items-start justify-between"><div><div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#a1644e]"><BriefcaseBusiness className="h-3.5 w-3.5" /> Foundation</div><h2 className="serif text-2xl">Benefits, at a glance</h2></div><button className="rounded-lg p-2 text-[#7d897f] hover:bg-[#eee9de]" aria-label="More benefit options" data-testid="button-benefit-options"><MoreHorizontal className="h-5 w-5" /></button></div><p className="mt-2 text-sm text-[#68766e]">The safeguards helping Maya's plan stay steady.</p><div className="mt-5 divide-y divide-[#eee8dc]">{benefits.length ? benefits.map((benefit) => <div key={benefit.name} className="flex items-center justify-between gap-3 py-4 first:pt-2 last:pb-1"><div className="flex min-w-0 items-center gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${benefit.status === 'protected' ? 'bg-[#dceee1] text-[#276345]' : 'bg-[#f8e8bc] text-[#765718]'}`}><ShieldCheck className="h-4 w-4" /></div><div className="min-w-0"><div className="truncate text-sm font-semibold">{benefit.name}</div><div className="truncate text-xs text-[#7a887d]">{benefit.note}</div></div></div><StatusPill status={benefit.status} /></div>) : <EmptyState icon={BriefcaseBusiness} title="No benefits added" copy="Add the first support or benefit when you are ready." />}</div></section>;
}

function ActivityCard({ activities }: { activities: { id: number; label: string; timeLabel: string; tone: string }[] }) {
  const toneStyles: Record<string, string> = { green: 'bg-[#dceee1] text-[#276345]', blue: 'bg-[#dce8ed] text-[#3c6370]', amber: 'bg-[#f8e8bc] text-[#765718]' };
  return <section className="rounded-2xl border border-[#e5dfd1] bg-[#fbf9f3] p-5 sm:p-6"><div className="flex items-start justify-between"><div><div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#a1644e]"><Activity className="h-3.5 w-3.5" /> Keeping track</div><h2 className="serif text-2xl">Recent activity</h2></div><button className="rounded-lg p-2 text-[#7d897f] hover:bg-[#eee9de]" aria-label="View all activity" data-testid="button-view-activity"><ArrowRight className="h-5 w-5" /></button></div><div className="mt-5 space-y-5">{activities.length ? activities.map((item) => <div className="flex gap-3" key={item.id}><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneStyles[item.tone] || toneStyles.green}`}><Check className="h-4 w-4" /></div><div><div className="text-sm leading-5">{item.label}</div><div className="mt-0.5 text-xs text-[#89948a]">{item.timeLabel}</div></div></div>) : <p className="py-8 text-sm text-[#68766e]">Your first completed step will appear here.</p>}</div></section>;
}

function PeoplePage() {
  const peopleQuery = useListPeople();
  const queryClient = useQueryClient();
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [search, setSearch] = useState('');
  const people = peopleQuery.data || [];
  const filtered = useMemo(() => people.filter((person) => `${person.name} ${person.relationship}`.toLowerCase().includes(search.toLowerCase())), [people, search]);
  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (person: Person) => { setEditing(person); setShowForm(true); };
  const savePerson = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { name: String(form.get('name') || ''), relationship: String(form.get('relationship') || ''), age: Number(form.get('age') || 0) };
    if (!payload.name || !payload.relationship) return;
    const onSuccess = () => { queryClient.invalidateQueries({ queryKey: getListPeopleQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setShowForm(false); };
    if (editing) updatePerson.mutate({ id: editing.id, data: { ...payload } }, { onSuccess });
    else createPerson.mutate({ data: payload }, { onSuccess });
  };
  if (peopleQuery.isLoading) return <LoadingState label="Finding the people in your plan" />;
  if (peopleQuery.isError) return <ErrorState onRetry={() => peopleQuery.refetch()} />;
  return <div><PageIntro eyebrow="People in your circle" title="The people make the plan." copy="Keep the important context close — who someone is to you, what they need, and how their plan is doing." action={<button onClick={openCreate} className="flex w-fit items-center gap-2 rounded-full bg-[#173937] px-5 py-3 text-sm font-semibold text-[#fffaf1] hover:-translate-y-0.5" data-testid="button-add-person"><Plus className="h-4 w-4" /> Add a person</button>} /><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="text-sm text-[#68766e]" data-testid="text-people-count"><strong className="text-[#173937]">{people.length}</strong> people in your care circle</div><label className="flex w-full items-center gap-2 rounded-xl border border-[#e5dfd1] bg-[#fbf9f3] px-3 py-2.5 sm:w-64"><Search className="h-4 w-4 text-[#89948a]" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-[#a0a89f]" placeholder="Search people" aria-label="Search people" data-testid="input-search-people" /></label></div>{filtered.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((person) => <PersonCard key={person.id} person={person} onEdit={() => openEdit(person)} />)}</div> : <EmptyState icon={UsersRound} title={search ? 'No one by that name' : 'Start your care circle'} copy={search ? 'Try another search or clear the field.' : 'Add a supported person to give your planning work a clear center.'} action={!search && <button onClick={openCreate} className="mt-5 rounded-full bg-[#f5b84f] px-5 py-2.5 text-sm font-bold text-[#173937]" data-testid="button-empty-add-person">Add first person</button>} />}{showForm && <PersonDialog editing={editing} pending={createPerson.isPending || updatePerson.isPending} onClose={() => setShowForm(false)} onSubmit={savePerson} />}</div>;
}

function PersonCard({ person, onEdit }: { person: Person; onEdit: () => void }) {
  return <article className="group rounded-2xl border border-[#e5dfd1] bg-[#fbf9f3] p-5 shadow-[0_3px_12px_rgba(23,57,55,.035)] transition-all hover:-translate-y-1 hover:shadow-[0_10px_22px_rgba(23,57,55,.08)]" data-testid={`card-person-${person.id}`}><div className="flex items-start justify-between"><Avatar initials={person.initials} accent={person.accent} /><button onClick={onEdit} className="rounded-lg p-2 text-[#89948a] opacity-70 hover:bg-[#eee9de] hover:text-[#173937] group-hover:opacity-100" aria-label={`Edit ${person.name}`} data-testid={`button-edit-person-${person.id}`}><MoreHorizontal className="h-5 w-5" /></button></div><h2 className="mt-5 text-lg font-semibold" data-testid={`text-person-name-${person.id}`}>{person.name}</h2><div className="mt-1 text-sm text-[#68766e]">{person.relationship} · {person.age} years old</div><div className="mt-5 flex items-center justify-between border-t border-[#eee8dc] pt-4"><StatusPill status={person.planStatus} /><button onClick={onEdit} className="flex items-center gap-1 text-xs font-bold text-[#a1644e] hover:text-[#173937]" data-testid={`button-view-person-${person.id}`}>View profile <ArrowRight className="h-3.5 w-3.5" /></button></div></article>;
}

function PersonDialog({ editing, pending, onClose, onSubmit }: { editing: Person | null; pending: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173937]/40 p-4" role="dialog" aria-modal="true" aria-labelledby="person-dialog-title"><form onSubmit={onSubmit} className="w-full max-w-md rounded-[24px] bg-[#fbf9f3] p-6 shadow-[0_24px_60px_rgba(23,57,55,.2)] sm:p-8"><div className="flex items-start justify-between"><div><div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#a1644e]">{editing ? 'Update profile' : 'New care circle member'}</div><h2 id="person-dialog-title" className="serif text-3xl">{editing ? 'Keep it current.' : 'Who are you supporting?'}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-[#89948a] hover:bg-[#eee9de]" aria-label="Close person form" data-testid="button-close-person-form"><X className="h-5 w-5" /></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-semibold">Full name<input name="name" required defaultValue={editing?.name} className="mt-1.5 w-full rounded-xl border border-[#ded8ca] bg-[#fffdf8] px-3.5 py-3 text-sm outline-none focus:border-[#a1644e] focus:ring-2 focus:ring-[#a1644e]/10" placeholder="e.g. Maya Lee" data-testid="input-person-name" /></label><label className="block text-sm font-semibold">Relationship<input name="relationship" required defaultValue={editing?.relationship} className="mt-1.5 w-full rounded-xl border border-[#ded8ca] bg-[#fffdf8] px-3.5 py-3 text-sm outline-none focus:border-[#a1644e] focus:ring-2 focus:ring-[#a1644e]/10" placeholder="e.g. Son, partner, client" data-testid="input-person-relationship" /></label><label className="block text-sm font-semibold">Age<input name="age" type="number" min="0" required defaultValue={editing?.age} className="mt-1.5 w-full rounded-xl border border-[#ded8ca] bg-[#fffdf8] px-3.5 py-3 text-sm outline-none focus:border-[#a1644e] focus:ring-2 focus:ring-[#a1644e]/10" placeholder="Age" data-testid="input-person-age" /></label></div><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#68766e] hover:bg-[#eee9de]" data-testid="button-cancel-person">Not now</button><button disabled={pending} type="submit" className="rounded-full bg-[#173937] px-5 py-2.5 text-sm font-semibold text-[#fffaf1] disabled:opacity-50" data-testid="button-save-person">{pending ? 'Saving…' : editing ? 'Save changes' : 'Add person'}</button></div></form></div>;
}

function TasksPage() {
  const tasksQuery = useListTasks();
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const tasks = tasksQuery.data || [];
  const filtered = filter === 'all' ? tasks : tasks.filter((task) => task.status === filter);
  const saveTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { title: String(form.get('title') || ''), category: String(form.get('category') || ''), dueLabel: String(form.get('dueLabel') || ''), priority: String(form.get('priority') || 'medium') as 'high' | 'medium' | 'low' };
    if (!payload.title || !payload.category) return;
    createTask.mutate({ data: payload }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setShowForm(false); } });
  };
  const setStatus = (task: Task, status: TaskStatus) => updateTask.mutate({ id: task.id, data: { status } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); } });
  if (tasksQuery.isLoading) return <LoadingState label="Lining up your next steps" />;
  if (tasksQuery.isError) return <ErrorState onRetry={() => tasksQuery.refetch()} />;
  return <div><PageIntro eyebrow="Planning in motion" title="Progress, made visible." copy="A plan does not have to live in your head. Keep the next right-sized action here, then let done feel good." action={<button onClick={() => setShowForm(true)} className="flex w-fit items-center gap-2 rounded-full bg-[#173937] px-5 py-3 text-sm font-semibold text-[#fffaf1] hover:-translate-y-0.5" data-testid="button-add-task"><Plus className="h-4 w-4" /> Add task</button>} /><div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">{[['all', 'All steps'], ['todo', 'To do'], ['in-progress', 'In progress'], ['done', 'Done']].map(([value, label]) => <button key={value} onClick={() => setFilter(value as 'all' | TaskStatus)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? 'bg-[#173937] text-[#fffaf1]' : 'bg-[#ebe6da] text-[#68766e] hover:bg-[#e2dccf]'}`} data-testid={`button-filter-${value}`}>{label}<span className="ml-2 text-xs opacity-60">{value === 'all' ? tasks.length : tasks.filter((task) => task.status === value).length}</span></button>)}</div>{filtered.length ? <div className="overflow-hidden rounded-2xl border border-[#e5dfd1] bg-[#fbf9f3]">{filtered.map((task, index) => <TaskRow key={task.id} task={task} onStatus={setStatus} first={index === 0} />)}</div> : <EmptyState icon={ClipboardCheck} title={filter === 'done' ? 'Nothing completed yet' : 'A clear page for the next step'} copy={filter === 'done' ? 'When you finish a task, take a moment to notice it here.' : 'Add one small action to begin building momentum.'} action={<button onClick={() => setShowForm(true)} className="mt-5 rounded-full bg-[#f5b84f] px-5 py-2.5 text-sm font-bold text-[#173937]" data-testid="button-empty-add-task">Add a task</button>} />}{showForm && <TaskDialog pending={createTask.isPending} onClose={() => setShowForm(false)} onSubmit={saveTask} />}</div>;
}

function TaskRow({ task, onStatus, first }: { task: Task; onStatus: (task: Task, status: TaskStatus) => void; first: boolean }) {
  const nextStatus: TaskStatus = task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo';
  return <div className={`group flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${!first ? 'border-t border-[#eee8dc]' : ''}`} data-testid={`row-task-${task.id}`}><div className="flex min-w-0 items-start gap-4"><button onClick={() => onStatus(task, nextStatus)} className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${task.status === 'done' ? 'border-[#68a27b] bg-[#68a27b] text-[#fffaf1]' : task.status === 'in-progress' ? 'border-[#6b98a3] bg-[#dce8ed] text-[#3c6370]' : 'border-[#c8c5b7] bg-transparent text-transparent hover:border-[#173937]'}`} aria-label={`${task.status === 'done' ? 'Reopen' : 'Complete'} ${task.title}`} data-testid={`button-toggle-task-${task.id}`}><Check className="h-4 w-4" /></button><div className="min-w-0"><div className={`text-[15px] font-semibold ${task.status === 'done' ? 'text-[#8a948b] line-through' : ''}`} data-testid={`text-task-title-${task.id}`}>{task.title}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#89948a]"><span>{task.category}</span><span className="h-1 w-1 rounded-full bg-[#b5b8ac]" /><span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{task.dueLabel || 'No date'}</span></div></div></div><div className="flex items-center gap-3 pl-11 sm:pl-0"><StatusPill status={task.priority} /><StatusPill status={task.status} /><button onClick={() => onStatus(task, nextStatus)} className="rounded-lg p-2 text-[#89948a] hover:bg-[#eee9de] hover:text-[#173937]" aria-label="Advance task status" data-testid={`button-advance-task-${task.id}`}><ArrowRight className="h-4 w-4" /></button></div></div>;
}

function TaskDialog({ pending, onClose, onSubmit }: { pending: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173937]/40 p-4" role="dialog" aria-modal="true"><form onSubmit={onSubmit} className="w-full max-w-md rounded-[24px] bg-[#fbf9f3] p-6 shadow-[0_24px_60px_rgba(23,57,55,.2)] sm:p-8"><div className="flex items-start justify-between"><div><div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#a1644e]">New planning step</div><h2 className="serif text-3xl">Make it manageable.</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-[#89948a] hover:bg-[#eee9de]" aria-label="Close task form" data-testid="button-close-task-form"><X className="h-5 w-5" /></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-semibold">What needs doing?<input name="title" required className="mt-1.5 w-full rounded-xl border border-[#ded8ca] bg-[#fffdf8] px-3.5 py-3 text-sm outline-none focus:border-[#a1644e]" placeholder="e.g. Review support budget" data-testid="input-task-title" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Category<input name="category" required className="mt-1.5 w-full rounded-xl border border-[#ded8ca] bg-[#fffdf8] px-3.5 py-3 text-sm outline-none focus:border-[#a1644e]" placeholder="Benefits" data-testid="input-task-category" /></label><label className="block text-sm font-semibold">When?<input name="dueLabel" className="mt-1.5 w-full rounded-xl border border-[#ded8ca] bg-[#fffdf8] px-3.5 py-3 text-sm outline-none focus:border-[#a1644e]" placeholder="Next Friday" data-testid="input-task-due" /></label></div><label className="block text-sm font-semibold">Priority<select name="priority" defaultValue="medium" className="mt-1.5 w-full rounded-xl border border-[#ded8ca] bg-[#fffdf8] px-3.5 py-3 text-sm outline-none focus:border-[#a1644e]" data-testid="select-task-priority"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label></div><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#68766e] hover:bg-[#eee9de]" data-testid="button-cancel-task">Not now</button><button disabled={pending} type="submit" className="rounded-full bg-[#173937] px-5 py-2.5 text-sm font-semibold text-[#fffaf1] disabled:opacity-50" data-testid="button-save-task">{pending ? 'Saving…' : 'Add task'}</button></div></form></div>;
}

function DocumentsPage() {
  const documentsQuery = useListDocuments();
  const documents = documentsQuery.data || [];
  if (documentsQuery.isLoading) return <LoadingState label="Opening your document shelf" />;
  if (documentsQuery.isError) return <ErrorState onRetry={() => documentsQuery.refetch()} />;
  return <div><PageIntro eyebrow="The paper trail" title="Everything important, together." copy="A calm home for the documents that make Maya's plan understandable, portable, and protected." action={<button className="flex w-fit items-center gap-2 rounded-full bg-[#ebe6da] px-5 py-3 text-sm font-semibold text-[#173937] hover:bg-[#e2dccf]" onClick={() => window.alert('Document uploads will be available in the next Soleil release.')} data-testid="button-add-document"><Plus className="h-4 w-4" /> Add document</button>} /><div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2 text-sm text-[#68766e]"><FileCheck2 className="h-4 w-4 text-[#68a27b]" /> {documents.filter((document) => document.status === 'ready').length} documents ready</div><button className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[#68766e] hover:bg-[#ebe6da]" data-testid="button-document-sort">Recently updated <ChevronDown className="h-4 w-4" /></button></div>{documents.length ? <div className="grid gap-4 md:grid-cols-2">{documents.map((document) => <DocumentCard key={document.id} document={document} />)}</div> : <EmptyState icon={FileText} title="Your shelf is ready when you are" copy="Keep letters, statements, and plan documents together so they are there when someone asks." action={<button className="mt-5 rounded-full bg-[#f5b84f] px-5 py-2.5 text-sm font-bold text-[#173937]" onClick={() => window.alert('Document uploads will be available in the next Soleil release.')} data-testid="button-empty-add-document">Add first document</button>} />}</div>;
}

function DocumentCard({ document }: { document: Document }) {
  return <article className="group flex items-center gap-4 rounded-2xl border border-[#e5dfd1] bg-[#fbf9f3] p-5 transition-all hover:-translate-y-1 hover:shadow-[0_10px_22px_rgba(23,57,55,.07)]" data-testid={`card-document-${document.id}`}><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${document.status === 'ready' ? 'bg-[#dceee1] text-[#276345]' : document.status === 'review' ? 'bg-[#f8e8bc] text-[#765718]' : 'bg-[#fae0d7] text-[#9b4939]'}`}><FileText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="truncate text-[15px] font-semibold" data-testid={`text-document-name-${document.id}`}>{document.name}</h2><div className="mt-1 flex items-center gap-2 text-xs text-[#89948a]"><span>{document.type}</span><span className="h-1 w-1 rounded-full bg-[#b5b8ac]" /><span>{document.updatedLabel}</span></div></div><div className="flex shrink-0 items-center gap-2"><StatusPill status={document.status} /><button className="rounded-lg p-2 text-[#89948a] hover:bg-[#eee9de] hover:text-[#173937]" aria-label={`Open ${document.name}`} data-testid={`button-open-document-${document.id}`}><ArrowRight className="h-4 w-4" /></button></div></article>;
}

function SettingsPage() {
  const [updates, setUpdates] = useState(true);
  const [digest, setDigest] = useState(false);
  return <div><PageIntro eyebrow="Make it yours" title="A workspace that knows its place." copy="Soleil is here to support your judgment, not replace it. Choose how the workspace keeps in touch." /><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-[#e5dfd1] bg-[#fbf9f3] p-6 sm:p-8"><div className="mb-7 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5e4b8] text-[#765718]"><UserRound className="h-5 w-5" /></div><div><h2 className="serif text-2xl">Your profile</h2><p className="text-sm text-[#68766e]">The person helping hold the plan.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">First name<input defaultValue="Maya" className="mt-1.5 w-full rounded-xl border border-[#ded8ca] bg-[#fffdf8] px-3.5 py-3 text-sm outline-none focus:border-[#a1644e]" data-testid="input-settings-first-name" /></label><label className="text-sm font-semibold">Last name<input defaultValue="Collins" className="mt-1.5 w-full rounded-xl border border-[#ded8ca] bg-[#fffdf8] px-3.5 py-3 text-sm outline-none focus:border-[#a1644e]" data-testid="input-settings-last-name" /></label></div><label className="mt-4 block text-sm font-semibold">Email address<input defaultValue="maya.collins@example.com" type="email" className="mt-1.5 w-full rounded-xl border border-[#ded8ca] bg-[#fffdf8] px-3.5 py-3 text-sm outline-none focus:border-[#a1644e]" data-testid="input-settings-email" /></label><button onClick={() => window.alert('Profile preferences saved.')} className="mt-6 rounded-full bg-[#173937] px-5 py-2.5 text-sm font-semibold text-[#fffaf1]" data-testid="button-save-settings">Save preferences</button></section><div className="space-y-5"><section className="rounded-2xl border border-[#e5dfd1] bg-[#fbf9f3] p-6"><div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dceee1] text-[#276345]"><Bell className="h-5 w-5" /></div><div><h2 className="serif text-2xl">Gentle reminders</h2><p className="text-sm text-[#68766e]">Keep the signal, lose the noise.</p></div></div><ToggleRow label="Planning updates" copy="A note when a step is due soon." checked={updates} onChange={() => setUpdates(!updates)} testId="toggle-planning-updates" /><ToggleRow label="Weekly reflection" copy="A short Sunday look at what moved." checked={digest} onChange={() => setDigest(!digest)} testId="toggle-weekly-reflection" /></section><section className="rounded-2xl border border-[#d4e0d8] bg-[#eef5ed] p-6"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#276345]" /><div><h2 className="font-semibold">A note about safety</h2><p className="mt-2 text-sm leading-6 text-[#557063]">Soleil helps you organize information and prepare for conversations. It is not financial, legal, medical, or benefits advice. When a decision carries real consequences, bring a qualified professional into the room.</p><button className="mt-4 text-sm font-bold text-[#276345] underline decoration-[#9fbdad] underline-offset-4" onClick={() => window.alert('Safety and privacy information will open here.')} data-testid="button-read-safety">Read safety & privacy details</button></div></div></section></div></div></div>;
}

function ToggleRow({ label, copy, checked, onChange, testId }: { label: string; copy: string; checked: boolean; onChange: () => void; testId: string }) {
  return <div className="flex items-center justify-between gap-4 border-t border-[#eee8dc] py-4 first:border-t-0 first:pt-0 last:pb-0"><div><div className="text-sm font-semibold">{label}</div><div className="mt-0.5 text-xs text-[#89948a]">{copy}</div></div><button onClick={onChange} role="switch" aria-label={label} aria-checked={checked} className={`relative h-7 w-12 shrink-0 rounded-full p-1 ${checked ? 'bg-[#68a27b]' : 'bg-[#d2d1c6]'}`} data-testid={testId}><span className={`block h-5 w-5 rounded-full bg-[#fffaf1] shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Shell><Switch><Route path="/" component={Overview} /><Route path="/people" component={PeoplePage} /><Route path="/tasks" component={TasksPage} /><Route path="/documents" component={DocumentsPage} /><Route path="/settings" component={SettingsPage} /><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
}