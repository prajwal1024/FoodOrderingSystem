from flask import Flask, render_template, jsonify, request
import json
from datetime import datetime

app = Flask(__name__)

# ─── In-memory menu data ───────────────────────────────────────────────
MENU = {
    "pizza": [
        {"id": 1,  "name": "Margherita Classic",     "desc": "Fresh mozzarella, San Marzano tomatoes, basil & extra-virgin olive oil",           "price": 12.99, "image": "🍕", "rating": 4.8, "popular": True},
        {"id": 2,  "name": "Pepperoni Feast",        "desc": "Double pepperoni, mozzarella & our signature spicy tomato sauce",                  "price": 14.99, "image": "🍕", "rating": 4.9, "popular": True},
        {"id": 3,  "name": "BBQ Chicken",            "desc": "Grilled chicken, red onion, cilantro & smoky BBQ sauce",                           "price": 15.99, "image": "🍕", "rating": 4.7, "popular": False},
        {"id": 4,  "name": "Veggie Supreme",         "desc": "Bell peppers, mushrooms, olives, onions & artichoke hearts",                       "price": 13.99, "image": "🍕", "rating": 4.6, "popular": False},
    ],
    "burgers": [
        {"id": 5,  "name": "Classic Smash Burger",   "desc": "Double smashed patty, American cheese, pickles & secret sauce",                    "price": 11.99, "image": "🍔", "rating": 4.9, "popular": True},
        {"id": 6,  "name": "Truffle Mushroom",       "desc": "Angus beef, sautéed mushrooms, Swiss cheese & truffle aioli",                      "price": 16.99, "image": "🍔", "rating": 4.8, "popular": True},
        {"id": 7,  "name": "Spicy Jalapeño",         "desc": "Pepper Jack cheese, crispy jalapeños, chipotle mayo & lettuce",                    "price": 13.99, "image": "🍔", "rating": 4.5, "popular": False},
        {"id": 8,  "name": "Beyond Plant Burger",    "desc": "Plant-based patty, avocado, tomato & vegan garlic sauce",                          "price": 14.99, "image": "🍔", "rating": 4.4, "popular": False},
    ],
    "sushi": [
        {"id": 9,  "name": "Dragon Roll",            "desc": "Shrimp tempura, avocado, eel & spicy mayo drizzle (8 pcs)",                        "price": 18.99, "image": "🍣", "rating": 4.9, "popular": True},
        {"id": 10, "name": "Rainbow Roll",           "desc": "California roll topped with assorted sashimi & tobiko (8 pcs)",                     "price": 19.99, "image": "🍣", "rating": 4.8, "popular": True},
        {"id": 11, "name": "Salmon Nigiri Set",      "desc": "Fresh Atlantic salmon on seasoned sushi rice (6 pcs)",                              "price": 14.99, "image": "🍣", "rating": 4.7, "popular": False},
        {"id": 12, "name": "Spicy Tuna Crunch",      "desc": "Spicy tuna, cucumber, tempura flakes & sriracha (8 pcs)",                           "price": 16.99, "image": "🍣", "rating": 4.6, "popular": False},
    ],
    "desserts": [
        {"id": 13, "name": "Molten Lava Cake",       "desc": "Warm chocolate cake with a gooey center, served with vanilla ice cream",            "price": 8.99,  "image": "🍫", "rating": 4.9, "popular": True},
        {"id": 14, "name": "Tiramisu",               "desc": "Classic Italian layers of espresso-soaked ladyfingers & mascarpone",                "price": 9.99,  "image": "🍰", "rating": 4.8, "popular": True},
        {"id": 15, "name": "Crème Brûlée",           "desc": "French vanilla custard with a caramelised sugar crust",                             "price": 7.99,  "image": "🍮", "rating": 4.7, "popular": False},
        {"id": 16, "name": "Mango Cheesecake",       "desc": "New York-style cheesecake with fresh mango coulis",                                 "price": 8.99,  "image": "🧁", "rating": 4.6, "popular": False},
    ],
    "drinks": [
        {"id": 17, "name": "Mango Tango Smoothie",   "desc": "Fresh mango, banana, yoghurt & a hint of honey",                                   "price": 6.99,  "image": "🥤", "rating": 4.7, "popular": True},
        {"id": 18, "name": "Iced Matcha Latte",      "desc": "Ceremonial-grade matcha, oat milk & vanilla syrup",                                 "price": 5.99,  "image": "🍵", "rating": 4.8, "popular": True},
        {"id": 19, "name": "Berry Bliss Mocktail",   "desc": "Mixed berries, lime, mint & sparkling water",                                       "price": 7.99,  "image": "🍹", "rating": 4.5, "popular": False},
        {"id": 20, "name": "Classic Cold Brew",      "desc": "24-hour cold-brewed coffee with caramel drizzle",                                   "price": 4.99,  "image": "☕", "rating": 4.6, "popular": False},
    ],
}

# ─── In-memory orders list ─────────────────────────────────────────────
orders: list[dict] = []


# ─── Routes ────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Serve the main SPA page."""
    return render_template("index.html")


@app.route("/api/menu")
def get_menu():
    """Return the full menu grouped by category."""
    return jsonify(MENU)


@app.route("/api/menu/<category>")
def get_category(category):
    """Return items for a single category."""
    items = MENU.get(category.lower())
    if items is None:
        return jsonify({"error": "Category not found"}), 404
    return jsonify(items)


@app.route("/api/order", methods=["POST"])
def place_order():
    """Accept an order from the client."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    required = ("name", "email", "address", "items")
    missing = [f for f in required if f not in data or not data[f]]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if not isinstance(data["items"], list) or len(data["items"]) == 0:
        return jsonify({"error": "Order must contain at least one item"}), 400

    order = {
        "id": len(orders) + 1,
        "customer": {
            "name": data["name"],
            "email": data["email"],
            "phone": data.get("phone", ""),
            "address": data["address"],
        },
        "items": data["items"],
        "total": sum(item.get("price", 0) * item.get("qty", 1) for item in data["items"]),
        "status": "confirmed",
        "placed_at": datetime.now().isoformat(),
    }
    orders.append(order)
    print(f"✅ Order #{order['id']} placed by {order['customer']['name']} — ${order['total']:.2f}")

    return jsonify({"message": "Order placed successfully!", "order": order}), 201


@app.route("/api/orders")
def list_orders():
    """List all orders (admin helper)."""
    return jsonify(orders)


# ─── Run ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5000)

