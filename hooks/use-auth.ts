import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export function useLogin() {
  const router = useRouter();

  return trpc.auth.login.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
  });
}

export function useLogout() {
  const router = useRouter();

  return trpc.auth.logout.useMutation({
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return trpc.auth.register.useMutation({
    onSuccess: () => {
      router.push("/login");
    },
  });
}
