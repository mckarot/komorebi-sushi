migrate((app) => {
  try {
    const existing = app.findCollectionByNameOrId("orders");
    if (existing) {
      console.log("Collection 'orders' already exists, skipping creation.");
      return;
    }
  } catch (err) {
    // La collection n'existe pas, on peut la créer
  }

  const orders = new Collection({
    name: "orders",
    type: "base"
  });
  orders.listRule = "";
  orders.viewRule = "";
  orders.createRule = "";
  orders.updateRule = "";
  orders.deleteRule = "";

  orders.fields.add(new TextField({ name: "customerName", required: true }));
  orders.fields.add(new TextField({ name: "status", required: true }));
  orders.fields.add(new JSONField({ name: "items", required: true }));
  orders.fields.add(new NumberField({ name: "total", required: true }));

  app.save(orders);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("orders");
    if (collection) {
      app.delete(collection);
    }
  } catch (err) {
    // Rien à supprimer
  }
});
