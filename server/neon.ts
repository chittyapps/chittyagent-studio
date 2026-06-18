export async function provisionNeonDatabase(tenantId: string) {
  const NEON_API_KEY = process.env.NEON_API_KEY;
  
  // Fail gracefully in development if no key is present
  if (!NEON_API_KEY) {
    console.warn("⚠️ NEON_API_KEY not set. Mocking DB provisioning for local development.");
    return { 
      projectId: `mock_project_${tenantId}`, 
      connectionString: "postgres://mock_user:mock_pass@ep-mock-db.us-east-2.aws.neon.tech/main" 
    };
  }

  try {
    const res = await fetch("https://console.neon.tech/api/v2/projects", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NEON_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project: {
          name: `chittypro_tenant_${tenantId}`,
          // You can lock this to a specific region to match your Cloudflare workers
          region_id: "aws-us-east-2", 
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Neon API Error: ${await res.text()}`);
    }

    const data = await res.json();
    
    // The Neon API returns the connection URIs immediately upon project creation
    const connectionString = data.connection_uris?.[0]?.connection_uri;
    
    console.log(`✅ Successfully provisioned Neon DB for tenant ${tenantId}`);

    return { 
      projectId: data.project.id, 
      connectionString 
    };
  } catch (error) {
    console.error("Failed to provision Neon DB:", error);
    throw error;
  }
}
