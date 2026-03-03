import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MutationWithToastOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: unknown[][];
  successMessage?: string | { title: string; description?: string };
  onSuccess?: (data: TData) => void;
  onError?: (err: Error) => void;
}

export function useMutationWithToast<TData = unknown, TVariables = void>({
  mutationFn,
  invalidateKeys,
  successMessage,
  onSuccess,
  onError,
}: MutationWithToastOptions<TData, TVariables>) {
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      invalidateKeys?.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      if (successMessage) {
        const msg =
          typeof successMessage === "string"
            ? { title: successMessage }
            : successMessage;
        toast(msg);
      }
      onSuccess?.(data);
    },
    onError: (err: Error) => {
      if (onError) {
        onError(err);
      } else {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
    },
  });
}
