import { Shield } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-card border-r border-border p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">ThreatPad</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Collaborative threat
            <br />
            intelligence, simplified.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Real-time note-taking built for CTI teams. Document, extract, and
            share threat intelligence — together.
          </p>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            {[
              'Real-time collaborative editing',
              'Automatic IOC extraction',
              'Structured CTI templates',
              'End-to-end encrypted private notes',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} ThreatPad. Built for security teams.
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
