import asyncio
import random
from datetime import datetime, timedelta
import numpy as np

from database import engine, AsyncSessionLocal, Base
from models.db_models import Supplier, Product, StockMovement
from models.enums import ProductStatus, SupplierStatus, MovementType

CATEGORIES = ["Electronics", "Food & Beverage", "Office Supplies", "Raw Materials", "Packaging"]
UNITS = ["pcs", "kg", "liter", "box", "pack"]

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created.")

async def seed_data():
    await create_tables()
    
    async with AsyncSessionLocal() as session:
        # 1. Create 10 Suppliers
        suppliers = []
        for i in range(1, 11):
            s = Supplier(
                name=f"Supplier Corporate {i}",
                contact_person=f"Contact {i}",
                email=f"contact{i}@supplier{i}.com",
                phone=f"+62812345678{i:02d}",
                address=f"Jalan Jenderal Sudirman No {i}, Jakarta",
                reliability_score=round(random.uniform(0.75, 0.99), 2),
                status=SupplierStatus.ACTIVE.value
            )
            session.add(s)
            suppliers.append(s)
        await session.commit()
        for s in suppliers:
            await session.refresh(s)

        # 2. Create 50 Products
        products = []
        for i in range(1, 51):
            cost = random.uniform(5000, 5000000)
            margin = random.uniform(1.2, 2.5)
            p = Product(
                sku=f"SKU-{CATEGORIES[i % 5][:3].upper()}-{i:04d}",
                name=f"Premium Product {i}",
                description=f"High quality product from {CATEGORIES[i % 5]}.",
                category=CATEGORIES[i % 5],
                unit=random.choice(UNITS),
                current_stock=0, # Will be calculated via movements
                min_stock=random.randint(5, 100),
                max_stock=random.randint(200, 1000),
                cost_price=round(cost, 2),
                sell_price=round(cost * margin, 2),
                supplier_id=random.choice(suppliers).id,
                lead_time_days=random.randint(3, 14),
                status=ProductStatus.ACTIVE.value
            )
            session.add(p)
            products.append(p)
        await session.commit()
        for p in products:
            await session.refresh(p)

        # 3. Create 12 months of movements (Seasonal, Trends, Noise + Out/In)
        print("Starting 12 month data generation. This might take a minute...")
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=365)
        
        movements = []
        for product in products:
            current_date = start_date
            running_stock = random.randint(50, product.max_stock or 500) # Initial base stock
            
            # Record an initial IN movement to establish base stock
            movements.append(StockMovement(
                product_id=product.id,
                movement_type=MovementType.IN.value,
                quantity=running_stock,
                reference=f"INITIAL-INV-{product.sku}",
                notes="Initial inventory setup",
                unit_cost=product.cost_price,
                created_by="system_seeder",
                created_at=current_date - timedelta(days=1)
            ))
            
            # Base daily demand profile per product
            base_demand = random.uniform(2, 50)
            trend_factor = random.choice([-0.01, 0, 0.01, 0.02]) # slight up/down trend
            
            day_counter = 0
            while current_date <= end_date:
                day_counter += 1
                
                # Seasonality (Weekly)
                weekday = current_date.weekday()
                weekly_multiplier = 0.5 if weekday >= 5 else 1.2 # Lower on weekends
                
                # Seasonality (Monthly - spike end of month)
                day_of_month = current_date.day
                monthly_multiplier = 1.5 if day_of_month > 25 else 1.0
                
                # Trend
                current_trend = 1.0 + (day_counter * trend_factor)
                
                # Noise
                noise = np.random.normal(1.0, 0.2)
                
                # Anomalies (2-3 random spikes/drops per year)
                anomaly_multiplier = 1.0
                if random.random() < 0.005: 
                    anomaly_multiplier = random.choice([0.2, 3.0, 4.0])
                
                # Calculate final daily demand (Out)
                daily_out = max(0, int(base_demand * weekly_multiplier * monthly_multiplier * current_trend * noise * anomaly_multiplier))
                
                # If stock < daily_out, clip it
                if running_stock < daily_out:
                    daily_out = running_stock

                if daily_out > 0:
                    running_stock -= daily_out
                    movements.append(StockMovement(
                        product_id=product.id,
                        movement_type=MovementType.OUT.value,
                        quantity=-daily_out,
                        reference=f"SO-{current_date.strftime('%Y%m%d')}-{random.randint(1000,9999)}",
                        created_by="system_seeder",
                        created_at=current_date
                    ))
                
                # Restock Logic (In logic)
                if running_stock <= product.min_stock:
                    restock_amount = (product.max_stock or (product.min_stock * 5)) - running_stock
                    running_stock += restock_amount
                    movements.append(StockMovement(
                        product_id=product.id,
                        movement_type=MovementType.IN.value,
                        quantity=restock_amount,
                        reference=f"PO-{current_date.strftime('%Y%m%d')}-{random.randint(1000,9999)}",
                        unit_cost=product.cost_price,
                        created_by="system_seeder",
                        created_at=current_date + timedelta(hours=random.randint(1,12))
                    ))
                
                current_date += timedelta(days=1)
                
            # Update product final stock
            product.current_stock = running_stock
        
        # Insert movements in batches
        batch_size = 5000
        for i in range(0, len(movements), batch_size):
            session.add_all(movements[i:i+batch_size])
            await session.commit()
            print(f"Inserted {min(i+batch_size, len(movements))}/{len(movements)} movements...")

        # Commit product updates
        session.add_all(products)
        await session.commit()
        
    print("Database fully seeded with realistic historical data.")

if __name__ == "__main__":
    asyncio.run(seed_data())
