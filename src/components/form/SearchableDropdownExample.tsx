"use client";

import { useState } from "react";
import SearchableDropdown from "./SearchableDropdown";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Product {
  sku: string;
  title: string;
  category: string;
}

export default function SearchableDropdownExample() {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Example data
  const users: User[] = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
    { id: "3", name: "Bob Johnson", email: "bob@example.com" },
    { id: "4", name: "Alice Brown", email: "alice@example.com" },
    { id: "5", name: "Charlie Wilson", email: "charlie@example.com" },
  ];

  const products: Product[] = [
    { sku: "P001", title: "Laptop", category: "Electronics" },
    { sku: "P002", title: "Smartphone", category: "Electronics" },
    { sku: "P003", title: "Desk Chair", category: "Furniture" },
    { sku: "P004", title: "Coffee Table", category: "Furniture" },
    { sku: "P005", title: "Running Shoes", category: "Sports" },
  ];

  const categories = ["Electronics", "Furniture", "Sports", "Books", "Clothing"];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        SearchableDropdown Examples
      </h1>
      
      <div className="space-y-4">
        <SearchableDropdown
          options={users}
          value={selectedUser}
          onChange={setSelectedUser}
          getOptionLabel={(user: User) => `${user.name} (${user.email})`}
          getOptionValue={(user: User) => user.id}
          placeholder="Select a user"
          label="Select User"
          required
        />

        <SearchableDropdown
          options={products}
          value={selectedProduct}
          onChange={setSelectedProduct}
          getOptionLabel={(product: Product) => `${product.title} - ${product.category}`}
          getOptionValue={(product: Product) => product.sku}
          placeholder="Select a product"
          label="Select Product"
        />

        <SearchableDropdown
          options={categories}
          value={selectedCategory}
          onChange={setSelectedCategory}
          getOptionLabel={(category: string) => category}
          getOptionValue={(category: string) => category}
          placeholder="Select a category"
          label="Select Category"
        />
      </div>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Selected Values:</h3>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>User: {selectedUser || "None"}</p>
          <p>Product: {selectedProduct || "None"}</p>
          <p>Category: {selectedCategory || "None"}</p>
        </div>
      </div>
    </div>
  );
}

