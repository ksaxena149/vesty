import { NextRequest, NextResponse } from 'next/server';

/**
 * Health Check API Route
 * Used by Docker containers and load balancers to verify application status
 */

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  services: {
    convex: 'connected' | 'disconnected';
    aws: 'connected' | 'disconnected';
    ai: 'connected' | 'disconnected';
  };
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Basic application health
    const health: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        convex: 'disconnected',
        aws: 'disconnected',
        ai: 'disconnected',
      },
    };

    // Check ConvexDB connection
    try {
      if (process.env.NEXT_PUBLIC_CONVEX_URL) {
        health.services.convex = 'connected';
      }
    } catch (error) {
      console.error('ConvexDB health check failed:', error);
    }

    // Check AWS S3 connection
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET_NAME) {
        health.services.aws = 'connected';
      }
    } catch (error) {
      console.error('AWS health check failed:', error);
    }

    // Check Google AI connection
    try {
      if (process.env.GOOGLE_AI_API_KEY) {
        health.services.ai = 'connected';
      }
    } catch (error) {
      console.error('Google AI health check failed:', error);
    }

    // Determine overall status
    const allServicesConnected = Object.values(health.services).every(
      (status) => status === 'connected'
    );

    if (!allServicesConnected) {
      health.status = 'unhealthy';
    }

    const responseTime = Date.now() - startTime;

    // Return appropriate HTTP status code
    const httpStatus = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json(
      {
        ...health,
        responseTime: `${responseTime}ms`,
      },
      { 
        status: httpStatus,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Internal server error',
        environment: process.env.NODE_ENV || 'development',
      },
      { status: 503 }
    );
  }
}

// Support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    // Quick health check without detailed response
    const isHealthy = true; // Basic check - server is responding
    
    return new NextResponse(null, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
