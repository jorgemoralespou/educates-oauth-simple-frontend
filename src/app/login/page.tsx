import { auth, enabledSocialProviders, hasStaticUsers } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { LoginButtons } from "@/components/LoginButtons";
import { getLogoUrl, getSiteConfig } from "@/lib/config";

interface LoginPageProps {
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { returnTo } = await searchParams;
  const callbackURL = returnTo || "/portal";

  if (session) {
    redirect(callbackURL);
  }

  const site = getSiteConfig();
  const homeHref = site.authBeforeCatalog ? "/portal" : "/";

  return (
    <>
      <Header homeHref={homeHref} siteTitle={site.title} logoUrl={getLogoUrl()} />
      <main className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="rounded-lg shadow-md p-8 max-w-md w-full mx-4" style={{ backgroundColor: 'var(--card-bg)' }}>
          <h1 className="text-2xl font-bold text-center mb-6">
            Login
          </h1>
          <LoginButtons enabledProviders={enabledSocialProviders} hasStaticUsers={hasStaticUsers} callbackURL={callbackURL} />
        </div>
      </main>
    </>
  );
}
