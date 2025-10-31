#!/usr/bin/env python3
"""
Test script for bulk task generation functionality.
This script can be run through Frappe console.
"""

import frappe


def test_bulk_generation():
	"""Test the bulk task generation functionality."""
	try:
		print("Starting bulk task generation test...")

		# Import the function
		from clapgrow_app.clapgrow_app.doctype.cg_task_definition.cg_task_definition import (
			generate_recurring_task_instances,
		)

		# Test 1: Check task definitions count
		print("\n1. Checking task definitions count...")
		total_definitions = frappe.db.count(
			"CG Task Definition", filters={"task_type": "Recurring", "enabled": 1}
		)
		print(f"Total recurring task definitions: {total_definitions}")

		# Test 2: Run the generation function
		print("\n2. Running task generation...")
		result = generate_recurring_task_instances()
		print(f"Generation result: {result}")

		# Check if a generation log was created
		if result.get("generation_log_id"):
			print(f"Generation log created: {result['generation_log_id']}")
		elif result.get("status") == "queued":
			print("Generation was queued for background processing")

		# Test 3: Check generation status
		print("\n3. Checking generation status...")
		from clapgrow_app.clapgrow_app.doctype.cg_task_definition.cg_task_definition import (
			get_bulk_generation_status,
		)

		status = get_bulk_generation_status()
		print(f"Generation status: {status}")

		# Test 4: Check recent generation logs
		print("\n4. Checking recent generation logs...")
		recent_logs = frappe.get_all(
			"CG Task Generation Log",
			fields=[
				"name",
				"generation_status",
				"total_definitions",
				"total_instances_created",
				"creation_time",
			],
			order_by="creation_time desc",
			limit=5,
		)

		print("Recent generation logs:")
		for log in recent_logs:
			print(
				f"  - {log.name}: {log.generation_status}, {log.total_definitions} definitions, {log.total_instances_created} instances"
			)

		print("\n✅ All tests completed successfully!")
		return True

	except Exception as e:
		print(f"\n❌ Test failed with error: {str(e)}")
		import traceback

		traceback.print_exc()
		return False


# Run the test
if __name__ == "__main__":
	test_bulk_generation()
