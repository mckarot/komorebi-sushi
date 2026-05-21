migrate((app) => {
  try {
    const existing = app.findCollectionByNameOrId("reservations");
    if (existing) {
      console.log("Collection 'reservations' already exists, skipping creation.");
      return;
    }
  } catch (err) {
    // La collection n'existe pas, on peut la créer
  }

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
  reservations.fields.add(new TextField({ name: "email", required: true }));
  reservations.fields.add(new TextField({ name: "phone", required: true }));
  reservations.fields.add(new TextField({ name: "date", required: true }));
  reservations.fields.add(new TextField({ name: "time", required: true }));
  reservations.fields.add(new NumberField({ name: "guests", required: true }));
  reservations.fields.add(new TextField({ name: "status", required: true }));
  reservations.fields.add(new TextField({ name: "specialRequests" }));

  app.save(reservations);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("reservations");
    if (collection) {
      app.delete(collection);
    }
  } catch (err) {
    // Rien à supprimer
  }
});
