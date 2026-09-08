export type HealthResponse = {
  status: string;
  service: string;
  environment: string;
  ai_mock_mode: boolean;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export async function getHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${apiBaseUrl}/health`, {
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      throw new Error(`Health check failed with ${response.status}`);
    }

    return response.json();
  } catch {
    return {
      status: "unreachable",
      service: "agentic-ai-debate-coach-api",
      environment: "unknown",
      ai_mock_mode: true,
    };
  }
}

