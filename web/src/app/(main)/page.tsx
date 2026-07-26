import { HomePage } from "@/features/home/server/components/home-page";

type HomeProps = {
  searchParams?: Promise<{
    archive_year?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  return <HomePage archiveYear={params?.archive_year} />;
}
