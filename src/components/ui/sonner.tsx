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
            "group toast !rounded-2xl !border !backdrop-blur-xl !shadow-[0_8px_24px_-12px_oklch(0.5_0.1_290_/_0.25)] !px-4 !py-3 !text-sm !font-medium",
          default: "!bg-white/85 !border-border !text-foreground",
          success: "!bg-lilac/90 !border-lilac !text-lilac-foreground",
          error: "!bg-blush/95 !border-blush !text-blush-foreground",
          info: "!bg-sky/90 !border-sky !text-sky-foreground",
          warning: "!bg-blush/80 !border-blush !text-blush-foreground",
          title: "!font-semibold !leading-tight",
          description: "!text-foreground/70 !text-xs !mt-0.5",
          actionButton:
            "!bg-primary !text-primary-foreground !rounded-full !px-3 !py-1.5 !text-xs !font-semibold",
          cancelButton:
            "!bg-muted !text-muted-foreground !rounded-full !px-3 !py-1.5 !text-xs !font-semibold",
          icon: "!mr-1",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
