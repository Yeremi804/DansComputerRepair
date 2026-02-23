"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import "./PartsPage.css";

// Categories shown on the Parts page UI.
const CATEGORIES = [
  "Processor (CPU)",
  "Graphics Card (GPU)",
  "Motherboard",
  "Memory (RAM)",
  "Storage",
  "Power Supply",
  "Case",
  "Cooling",
  "Operating System",
  "Networking",
];

// Maps UI category names -> Supabase table names
const CATEGORY_TO_TABLE = {
  "Processor (CPU)": "cpus",
  "Graphics Card (GPU)": "gpus",
  Motherboard: "motherboards",
  "Memory (RAM)": "memories",
  Storage: "storages",
  "Power Supply": "psus",
  Case: "cases",
  Cooling: "coolings",
  "Operating System": "operating_systems",
  Networking: "networkings",
};

export default function AdminPartsPage() {
  // Supabase browser client (auth/session based in the browser)
  const supabase = createSupabaseBrowserClient();

  /**
   * Parts are stored grouped by category:
   * {
   *   "Processor (CPU)": [{ id, name, price }, ...],
   *   "Graphics Card (GPU)": [...],
   * }
   */
  const [parts, setParts] = useState({});

  // Controls visibility of Add/Edit modal
  const [showModal, setShowModal] = useState(false);

  const [editItemIndex, setEditItemIndex] = useState(null);

  // Which category the modal is currently editing/adding to
  const [currentCategory, setCurrentCategory] = useState("");

  // Form values used in the Add/Edit modal
  const [form, setForm] = useState({ name: "", price: "" });

  // Controls visibility of delete confirmation modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  /**
   * Holds the item to delete + where it is in state so we can update UI quickly.
   * pendingDelete = { category, index, item, tableName }
   */
  const [pendingDelete, setPendingDelete] = useState(null);

  /**
   * Fetch all categories from Supabase.
   * Uses CATEGORY_TO_TABLE to decide which DB table to pull from.
   */
  const fetchAllParts = useCallback(async () => {
    const allParts = {};

    try {
      for (const category of CATEGORIES) {
        const tableName = CATEGORY_TO_TABLE[category];

        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .order("id", { ascending: true });

        // If fetch fails for a category, we still render the rest
        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          allParts[category] = [];
        } else {
          // Normalize DB results into the shape our UI expects
          allParts[category] = (data || []).map((item) => ({
            id: item.id?.toString() ?? "",
            name: item.name ?? "",
            price: item.price != null ? String(item.price) : "",
          }));
        }
      }

      setParts(allParts);
    } catch (err) {
      console.error("Error fetching parts:", err);
    }
  }, [supabase]);

  // Fetch all parts on initial render
  useEffect(() => {
    fetchAllParts();
  }, [fetchAllParts]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        // Close Add/Edit modal if open
        if (showModal) {
          setShowModal(false);
          setEditItemIndex(null);
        }
        // Close Delete modal if open
        if (confirmDeleteOpen) {
          setConfirmDeleteOpen(false);
          setPendingDelete(null);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal, confirmDeleteOpen]);

  // Close add/edit modal and reset edit index
  const closeAddEditModal = () => {
    setShowModal(false);
    setEditItemIndex(null);
  };

  // Open modal for adding a brand new item in a category
  const openAddModal = (category) => {
    setCurrentCategory(category);
    setForm({ name: "", price: "" });
    setEditItemIndex(null);
    setShowModal(true);
  };

  // Open modal for editing an existing item (at a specific index)
  const openEditModal = (category, index, item) => {
    setCurrentCategory(category);
    setEditItemIndex(index);
    setForm({ name: item.name ?? "", price: item.price ?? "" });
    setShowModal(true);
  };

  /**
   * Inserts a row into audit_logs for tracking admin actions.
   * "Best-effort" meaning failures do not block CRUD actions.
   */
  const insertAudit = async ({
    action,
    entity_type,
    entity_id,
    metadata = {},
  }) => {
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user) return;

      const u = userRes.user;

      const { error: auditErr } = await supabase.from("audit_logs").insert([
        {
          actor_user_id: u.id,
          actor_email: u.email,
          action,
          entity_type,
          entity_id: String(entity_id),
          metadata,
        },
      ]);

      if (auditErr) console.error("Audit insert error:", auditErr);
    } catch (err) {
      console.error("Audit logging failed:", err);
    }
  };

  /**
   * Confirm button in the Add/Edit modal.
   * If editItemIndex !== null => update existing row.
   * Otherwise => insert a new row.
   */
  const handleConfirm = async () => {
    if (!form.name.trim()) {
      alert("Please enter an item name.");
      return;
    }

    // Determine which table we are editing based on selected category
    const tableName = CATEGORY_TO_TABLE[currentCategory];

    // Convert price to a number (or null if blank)
    const priceValue = form.price.trim() ? parseFloat(form.price) : null;

    try {
      if (editItemIndex !== null) {
        // -----------------------
        // UPDATE existing item
        // -----------------------
        const itemToUpdate = parts[currentCategory]?.[editItemIndex];
        if (!itemToUpdate) return;

        const { error } = await supabase
          .from(tableName)
          .update({
            name: form.name.trim(),
            price: priceValue,
          })
          .eq("id", parseInt(itemToUpdate.id));

        if (error) throw error;

        // Update UI immediately without refetching
        setParts((prev) => ({
          ...prev,
          [currentCategory]: prev[currentCategory].map((it, idx) =>
            idx === editItemIndex
              ? { ...it, name: form.name.trim(), price: form.price.trim() }
              : it
          ),
        }));

        // Audit log entry for audit trail dashboard item
        await insertAudit({
          action: "PART_UPDATED",
          entity_type: tableName,
          entity_id: itemToUpdate.id,
          metadata: {
            category: currentCategory,
            name: form.name.trim(),
            price: priceValue,
            previous: { name: itemToUpdate.name, price: itemToUpdate.price },
          },
        });
      } else {
        // -----------------------
        // INSERT new item
        // -----------------------
        const { data, error } = await supabase
          .from(tableName)
          .insert({
            name: form.name.trim(),
            price: priceValue,
          })
          .select();

        if (error) throw error;

        // Append new item to UI state without refetching
        if (data?.[0]) {
          const inserted = data[0];

          setParts((prev) => ({
            ...prev,
            [currentCategory]: [
              ...(prev[currentCategory] || []),
              {
                id: inserted.id?.toString() ?? "",
                name: inserted.name ?? "",
                price: inserted.price != null ? String(inserted.price) : "",
              },
            ],
          }));

          // Audit log entry
          await insertAudit({
            action: "PART_CREATED",
            entity_type: tableName,
            entity_id: inserted.id,
            metadata: {
              category: currentCategory,
              name: inserted.name,
              price: inserted.price ?? null,
            },
          });
        }
      }

      // Close modal after success
      closeAddEditModal();
    } catch (err) {
      console.error("Error saving item:", err);
      alert(`Error: ${err?.message || "Unknown error"}`);
    }
  };

  /**
   * Called when user clicks trash icon.
   * Stores delete target and opens the confirmation modal.
   */
  const requestDelete = (category, index, item) => {
    setPendingDelete({
      category,
      index,
      item,
      tableName: CATEGORY_TO_TABLE[category],
    });
    setConfirmDeleteOpen(true);
  };

  /**
   * Runs only after user clicks "Yes, remove" in confirmation modal.
   * Deletes from Supabase then removes from UI state immediately.
   */
  const performDelete = async () => {
    if (!pendingDelete) return;

    const { category, index, item, tableName } = pendingDelete;

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", parseInt(item.id));

      if (error) throw error;

      // Update UI immediately without refetching
      setParts((prev) => ({
        ...prev,
        [category]: prev[category].filter((_, i) => i !== index),
      }));

      // Audit log entry
      await insertAudit({
        action: "PART_DELETED",
        entity_type: tableName,
        entity_id: item.id,
        metadata: { category, name: item.name, price: item.price ?? null },
      });
    } catch (err) {
      console.error("Error deleting item:", err);
      alert(`Error: ${err?.message || "Unknown error"}`);
    } finally {
      // Always close and clear confirmation state
      setConfirmDeleteOpen(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="dashboard">
      <Sidebar />

      {/* ---------------- Main Content ---------------- */}
      <div className="main">
        <h1>Parts</h1>

        <div className="parts-container">
          {CATEGORIES.map((category) => (
            <div className="category" key={category}>
              <h3>{category}</h3>

              <div className="items">
                {/* Items for this category */}
                {(parts[category] || []).map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="item"
                    // Clicking item row opens edit modal
                    onClick={() => openEditModal(category, index, item)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="item-text">
                      <span className="item-name">{item.name}</span>
                      {item.price ? (
                        <span className="item-price"> - ${item.price}</span>
                      ) : null}
                    </div>

                    {/* Action buttons hidden until hover/focus (CSS) */}
                    <div className="item-actions">
                      {/* stopPropagation prevents the row click from firing */}
                      <button
                        type="button"
                        className="icon-btn"
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(category, index, item);
                        }}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDelete(category, index, item);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Add button opens modal in "add" mode (edit index is null) */}
                <motion.button
                  className="add-btn"
                  onClick={() => openAddModal(category)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  + Add
                </motion.button>
              </div>
            </div>
          ))}
        </div>

        {/* ---------------- Add/Edit Modal ----------------
            - Clicking the overlay closes the modal
            - Clicking inside modal does NOT close (stopPropagation)
        */}
        {showModal && (
          <div className="modal" onClick={closeAddEditModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">
                  {editItemIndex !== null ? "Edit Item" : "Add Item"}
                </h3>

                {/* X close button */}
                <button
                  type="button"
                  className="close-btn"
                  onClick={closeAddEditModal}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Two-field form layout (CSS grid for readability) */}
              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label">Item name</label>
                  <input
                    className="field-input"
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="e.g. AMD Ryzen 3"
                    maxLength={60}
                    autoFocus
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">Price</label>
                  <input
                    className="field-input"
                    type="number"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="e.g. 200"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeAddEditModal}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirm}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Delete Confirmation Modal ----------------
            Triggered only by trash icon.
        */}
        {confirmDeleteOpen && pendingDelete && (
          <div
            className="modal"
            onClick={() => {
              setConfirmDeleteOpen(false);
              setPendingDelete(null);
            }}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Confirm removal</h3>

                {/* X close button */}
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => {
                    setConfirmDeleteOpen(false);
                    setPendingDelete(null);
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <p className="confirm-text">
                Are you sure you want to remove{" "}
                <b>{pendingDelete.item.name}</b>
                {pendingDelete.item.price
                  ? ` ($${pendingDelete.item.price})`
                  : ""}
                ?
                <br />
                This action cannot be undone.
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setConfirmDeleteOpen(false);
                    setPendingDelete(null);
                  }}
                >
                  Cancel
                </button>

                {/* Only this button actually performs the delete */}
                <button
                  type="button"
                  className="btn-danger"
                  onClick={performDelete}
                >
                  Yes, remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
