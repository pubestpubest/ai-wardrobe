import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast !rounded-2xl !border-2 !backdrop-blur-xl !shadow-[0_8px_24px_-12px_oklch(0.5_0.1_290_/_0.3)] !px-4 !py-3 !text-sm !font-medium !gap-2",
          default: "!bg-white/90 !border-border !text-foreground",
          success:
            "!bg-lilac !border-[oklch(0.55_0.15_295)] !text-lilac-foreground [&_[data-icon]]:!text-[oklch(0.55_0.15_295)]",
          error:
            "!bg-blush !border-[oklch(0.55_0.18_5)] !text-blush-foreground [&_[data-icon]]:!text-[oklch(0.55_0.18_5)]",
          info: "!bg-sky !border-[oklch(0.5_0.15_245)] !text-sky-foreground [&_[data-icon]]:!text-[oklch(0.5_0.15_245)]",
          warning:
            "!bg-[oklch(0.92_0.08_85)] !border-[oklch(0.6_0.15_75)] !text-[oklch(0.32_0.08_75)] [&_[data-icon]]:!text-[oklch(0.6_0.15_75)]",
          title: "!font-semibold !leading-tight",
          description: "!text-current/70 !text-xs !mt-0.5",
          actionButton:
            "!bg-primary !text-primary-foreground !rounded-full !px-3 !py-1.5 !text-xs !font-semibold",
          cancelButton:
            "!bg-muted !text-muted-foreground !rounded-full !px-3 !py-1.5 !text-xs !font-semibold",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
