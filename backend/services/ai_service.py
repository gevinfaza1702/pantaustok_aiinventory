from openai import AsyncOpenAI
from config import settings
import json
import logging

logger = logging.getLogger(__name__)

# Initialize the async OpenAI client pointing to SumoPod
client = AsyncOpenAI(
    api_key=settings.SUMOPOD_API_KEY,
    base_url=settings.SUMOPOD_BASE_URL
)

async def generate_inventory_insights(dashboard_data: dict) -> str:
    """
    Takes the aggregated dashboard KPIs and charts and asks the LLM
    to generate actionable, professional insights for the inventory manager.
    """
    if not settings.SUMOPOD_API_KEY:
        return "SumoPod API key is not configured. Analytics insights are currently disabled."

    try:
        prompt = f"""
You are a Senior Inventory Analyst. Review the following real-time dashboard data for our inventory management system (StockSense AI).

Provide a concise, 3-paragraph executive summary highlighting:
1. Overall stock health and inventory value.
2. Any immediate warnings (e.g., critical low stock items or dropping turnover rates).
3. 2-3 strategic recommendations based on the demand trends and category breakdown.

Keep it highly professional, formatting it nicely with bullet points where appropriate.
Do not use generic filler words. Be precise with the numbers provided.

DASHBOARD DATA:
{json.dumps(dashboard_data, indent=2)}
"""

        response = await client.chat.completions.create(
            model=settings.SUMOPOD_MODEL,
            messages=[
                {"role": "system", "content": "You are a Senior Inventory Analyst generating insights from raw JSON KPIs."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.3
        )

        return response.choices[0].message.content

    except Exception as e:
        logger.error(f"Failed to generate SumoPod insights: {str(e)}")
        return "The AI Intelligence system is temporarily unavailable. Please refer to the raw metrics above."
