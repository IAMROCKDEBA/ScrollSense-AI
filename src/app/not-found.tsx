import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Scrolly } from "@/components/ui/scrolly";

export const metadata = {
  title: "Page not found"
};

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center">
      <div className="flex flex-col items-center gap-6">
        <Scrolly mood="sleepy" size={150} label="Scrolly is napping" />
        <div className="space-y-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-primary">Error 404</p>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            You scrolled <em className="text-aurora pr-1 italic">too far.</em>
          </h1>
          <p className="text-muted-foreground">That page does not exist. Let&apos;s head back somewhere real.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/">
            Back home
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
