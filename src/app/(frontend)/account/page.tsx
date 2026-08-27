import { redirect } from "next/navigation";

type AccountPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const redirectParams = new URLSearchParams();
  if (params.error) redirectParams.set("error", params.error);
  if (params.message) redirectParams.set("message", params.message);
  const suffix = redirectParams.toString();
  redirect(suffix ? `/users/me?${suffix}` : "/users/me");
}
