"use client";

import { trpc } from "@/lib/trpc";

export function ExampleClient() {
  // Example of using tRPC with React Query
  const { data, isLoading, error } = trpc.userList.useQuery("test-input");

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold mb-2">tRPC + React Query Example</h2>
      <p>Data: {data}</p>
    </div>
  );
}
