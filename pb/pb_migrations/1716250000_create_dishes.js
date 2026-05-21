migrate((app) => {
  // 1. Créer la collection 'dishes'
  const dishes = new Collection({
    name: "dishes",
    type: "base"
  });
  dishes.listRule = "";
  dishes.viewRule = "";
  dishes.createRule = "";
  dishes.updateRule = "";
  dishes.deleteRule = "";

  dishes.fields.add(new TextField({ name: "name", required: true }));
  dishes.fields.add(new TextField({ name: "description" }));
  dishes.fields.add(new TextField({ name: "price", required: true }));
  dishes.fields.add(new TextField({ name: "category", required: true }));
  dishes.fields.add(new TextField({ name: "image", required: true }));
  dishes.fields.add(new BoolField({ name: "isPopular" }));
  dishes.fields.add(new BoolField({ name: "isNew" }));
  app.save(dishes);

  // 2. Insérer les plats initiaux (seeding)
  const defaultDishes = [
    {
      name: "Sake Nigiri",
      description: "Saumon frais de qualité supérieure sur riz vinaigré.",
      price: "8€",
      category: "Nigiri",
      image: "https://images.unsplash.com/photo-1583623025817-d180a2221d0a?q=80&w=800&auto=format&fit=crop",
      isPopular: true,
      isNew: false
    },
    {
      name: "Maguro Nigiri",
      description: "Thon rouge fondant, sélectionné chaque matin.",
      price: "10€",
      category: "Nigiri",
      image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?q=80&w=800&auto=format&fit=crop",
      isPopular: false,
      isNew: false
    },
    {
      name: "Dragon Roll",
      description: "Crevette tempura, avocat, anguille grillée et sauce unagi.",
      price: "18€",
      category: "Rolls",
      image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800&auto=format&fit=crop",
      isPopular: true,
      isNew: false
    },
    {
      name: "Spicy Tuna Roll",
      description: "Thon épicé, concombre, oignons verts et sésame.",
      price: "14€",
      category: "Rolls",
      image: "https://images.unsplash.com/photo-1559466273-d95e72debaf8?q=80&w=800&auto=format&fit=crop",
      isPopular: false,
      isNew: false
    },
    {
      name: "Sashimi Moriawase",
      description: "Assortiment de 12 pièces de poissons fins.",
      price: "28€",
      category: "Sashimi",
      image: "https://images.unsplash.com/photo-1534422298391-e4f8c170db76?q=80&w=800&auto=format&fit=crop",
      isPopular: false,
      isNew: true
    },
    {
      name: "Hamachi Sashimi",
      description: "Sériole japonaise, servie avec ponzu et piment.",
      price: "22€",
      category: "Sashimi",
      image: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=800&auto=format&fit=crop",
      isPopular: false,
      isNew: false
    }
  ];

  for (const item of defaultDishes) {
    const record = new Record(dishes, item);
    app.save(record);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("dishes");
  app.delete(collection);
});
