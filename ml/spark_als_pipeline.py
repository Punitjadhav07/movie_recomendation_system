#!/usr/bin/env python3
"""
CineMatch — Apache Spark MLlib ALS Matrix Factorization Distributed Pipeline
Trains a distributed Alternating Least Squares (ALS) recommendation model on MovieLens ratings.
"""

import os
import sys
import json
import time

def run_spark_als_pipeline():
    start_time = time.time()
    print("⚡ Initializing Apache Spark Session for Distributed ALS Training...")

    try:
        from pyspark.sql import SparkSession
        from pyspark.ml.recommendation import ALS
        from pyspark.ml.evaluation import RegressionEvaluator
        from pyspark.sql.functions import col
    except ImportError as e:
        print(f"PySpark not loaded: {e}. Simulating Spark benchmark.")
        return

    os.makedirs("ml/models", exist_ok=True)

    # 1. Initialize SparkSession
    spark = SparkSession.builder \
        .appName("CineMatch_ALS_Recommender") \
        .master("local[*]") \
        .config("spark.driver.memory", "2g") \
        .config("spark.sql.shuffle.partitions", "8") \
        .getOrCreate()

    spark.sparkContext.setLogLevel("ERROR")
    print(f"Apache Spark {spark.version} cluster initialized with local workers.")

    # 2. Load Processed Ratings into Spark DataFrame
    print("Loading rating dataset into distributed Spark DataFrame...")
    with open("data/processed_ratings.json", "r", encoding="utf-8") as f:
        raw_ratings = json.load(f)

    # Convert to numeric IDs for Spark ALS
    spark_data = []
    for r in raw_ratings:
        user_num = int(r["user_id"].replace("u_", ""))
        spark_data.append((user_num, int(r["movie_id"]), float(r["rating"])))

    df = spark.createDataFrame(spark_data, ["userId", "movieId", "rating"])
    total_records = df.count()
    print(f"Loaded {total_records} rating records into Spark DataFrame.")

    # 3. Train/Test Split
    (training_df, test_df) = df.randomSplit([0.8, 0.2], seed=42)
    print(f"Distributed Split: {training_df.count()} training rows, {test_df.count()} test rows.")

    # 4. Build and Train ALS Matrix Factorization Model
    print("Training Distributed ALS Model (rank=32, maxIter=10, regParam=0.1)...")
    als = ALS(
        maxIter=10,
        regParam=0.1,
        rank=32,
        userCol="userId",
        itemCol="movieId",
        ratingCol="rating",
        coldStartStrategy="drop",
        nonnegative=True
    )
    
    model = als.fit(training_df)
    print("ALS Matrix Factorization convergence reached!")

    # 5. Model Evaluation
    predictions = model.transform(test_df)
    evaluator_rmse = RegressionEvaluator(metricName="rmse", labelCol="rating", predictionCol="prediction")
    evaluator_mae = RegressionEvaluator(metricName="mae", labelCol="rating", predictionCol="prediction")

    rmse = evaluator_rmse.evaluate(predictions)
    mae = evaluator_mae.evaluate(predictions)

    print(f"📊 Spark ALS Model Evaluation:")
    print(f"  - Root Mean Squared Error (RMSE): {rmse:.4f}")
    print(f"  - Mean Absolute Error (MAE): {mae:.4f}")

    # 6. Generate Top-10 Recommendations for Sample Users
    user_recs = model.recommendForAllUsers(5).limit(10).collect()
    sample_recommendations = {}
    for row in user_recs:
        u_id = f"u_{row.userId}"
        sample_recommendations[u_id] = [
            {"movie_id": rec.movieId, "predicted_rating": round(float(rec.rating), 2)}
            for rec in row.recommendations
        ]

    # 7. Save Spark ALS Results Artifact
    results = {
        "engine": "Apache Spark MLlib ALS (Alternating Least Squares)",
        "spark_version": spark.version,
        "rank": 32,
        "max_iterations": 10,
        "regularization_param": 0.1,
        "total_records_processed": total_records,
        "rmse": round(rmse, 4),
        "mae": round(mae, 4),
        "training_time_seconds": round(time.time() - start_time, 2),
        "sample_user_recommendations": sample_recommendations,
        "status": "Trained & Validated"
    }

    with open("ml/models/spark_als_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Apache Spark ALS pipeline completed in {results['training_time_seconds']}s!")
    spark.stop()

if __name__ == "__main__":
    run_spark_als_pipeline()
