migrate((app) => {
  // 1. Mettre à jour la collection 'users' existante
  try {
    const users = app.findCollectionByNameOrId("users");
    
    // Vérifier si le champ role existe déjà
    let roleField = null;
    try {
      roleField = users.fields.getByName("role");
    } catch (e) {
      // getByName lève une exception s'il ne trouve pas le champ
    }

    if (!roleField) {
      users.fields.add(new SelectField({
        name: "role",
        required: true,
        maxSelect: 1,
        values: ["admin", "client", "kitchen", "server"]
      }));
      app.save(users);
    }
  } catch (err) {
    console.error("Erreur lors de la modification de 'users':", err);
  }

  // 2. Créer la collection 'reservations'
  try {
    const reservations = new Collection({
      name: "reservations",
      type: "base"
    });
    reservations.listRule = "";
    reservations.viewRule = "";
    reservations.createRule = "";
    reservations.updateRule = "";
    reservations.deleteRule = "";

    reservations.fields.add(new TextField({ name: "userId" }));
    reservations.fields.add(new TextField({ name: "name", required: true }));
    reservations.fields.add(new EmailField({ name: "email", required: true }));
    reservations.fields.add(new TextField({ name: "phone" }));
    reservations.fields.add(new TextField({ name: "date", required: true }));
    reservations.fields.add(new TextField({ name: "time", required: true }));
    reservations.fields.add(new NumberField({ name: "guests", required: true }));
    reservations.fields.add(new SelectField({ name: "status", required: true, maxSelect: 1, values: ["pending", "confirmed", "cancelled"] }));
    reservations.fields.add(new TextField({ name: "specialRequests" }));
    app.save(reservations);
  } catch (err) {
    console.error("Erreur lors de la création de 'reservations':", err);
  }

  // 3. Créer la collection 'orders'
  try {
    const orders = new Collection({
      name: "orders",
      type: "base"
    });
    orders.listRule = "";
    orders.viewRule = "";
    orders.createRule = "";
    orders.updateRule = "";
    orders.deleteRule = "";

    orders.fields.add(new TextField({ name: "userId" }));
    orders.fields.add(new TextField({ name: "customerName", required: true }));
    orders.fields.add(new EmailField({ name: "customerEmail", required: true }));
    orders.fields.add(new JSONField({ name: "items", required: true }));
    orders.fields.add(new NumberField({ name: "total", required: true }));
    orders.fields.add(new SelectField({ name: "status", required: true, maxSelect: 1, values: ["pending", "preparing", "ready", "completed", "cancelled"] }));
    app.save(orders);
  } catch (err) {
    console.error("Erreur lors de la création de 'orders':", err);
  }
});
