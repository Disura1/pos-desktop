import React, { useState, useEffect } from "react";
import {
  getCategories,
  addCategory,
  deleteCategory,
  updateCategory,
} from "../services/categoryService";
import {
  addProduct,
  getProductsByCategory,
  deleteProduct,
  updateProduct,
  addVariant,
} from "../services/productService";

const CategoryManager = () => {
  const [allCats, setAllCats] = useState([]);
  const [items, setItems] = useState([]);
  const [parentId, setParentId] = useState(null);

  const [showCatModal, setShowCatModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // States initialized with empty strings to prevent "controlled vs uncontrolled" input errors
  const [catData, setCatData] = useState({ id: null, name: "" });
  const [itemData, setItemData] = useState({
    id: null,
    name: "",
    base_price: "",
    description: "",
    main_image: "",
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantData, setVariantData] = useState({
    sku: "",
    size: "",
    color: "",
    barcode: "",
    variant_price: "",
  });

  useEffect(() => {
    loadCategories();
    if (parentId) loadItems(parentId);
    else setItems([]);
  }, [parentId]);

  const loadCategories = async () => {
    const data = await getCategories();
    setAllCats(data);
  };

  const loadItems = async (id) => {
    const data = await getProductsByCategory(id);
    setItems(data || []);
  };

  const handleBackToParent = () => {
    const currentCat = allCats.find((c) => c.id === parentId);
    setParentId(currentCat ? currentCat.parent_id : null);
  };

  // --- ACTIONS ---
  const handleSaveCategory = async () => {
    if (editMode) {
      await updateCategory(catData.id, { name: catData.name });
    } else {
      await addCategory({ name: catData.name, parent_id: parentId });
    }
    closeModals();
    loadCategories();
  };

  const handleSaveItem = async () => {
    if (editMode) {
      await updateProduct(itemData.id, itemData);
    } else {
      await addProduct({ ...itemData, category_id: parentId });
    }
    closeModals();
    loadItems(parentId);
  };

  const handleSaveVariant = async () => {
    if (!variantData.sku || !variantData.barcode)
      return alert("SKU and Barcode are required");
    await addVariant({ ...variantData, product_id: selectedProduct.id });
    setVariantData({
      sku: "",
      size: "",
      color: "",
      barcode: "",
      variant_price: "",
    });
    alert("Variant Added Successfully!");
  };

  const closeModals = () => {
    setShowCatModal(false);
    setShowItemModal(false);
    setShowVariantModal(false);
    setEditMode(false);
    setCatData({ id: null, name: "" });
    setItemData({
      id: null,
      name: "",
      base_price: "",
      description: "",
      main_image: "",
    });
  };

  const currentCategories = allCats.filter((c) => c.parent_id === parentId);

  return (
    <div
      style={{
        padding: "30px",
        fontFamily: "sans-serif",
        backgroundColor: "#fdfdfd",
      }}
    >
      {/* HEADER SECTION */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <div>
          <h2 style={{ color: "#333", margin: 0 }}>
            {parentId
              ? `📂 ${allCats.find((c) => c.id === parentId)?.name}`
              : "📂 Main Categories"}
          </h2>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            {parentId && (
              <>
                <button onClick={() => setParentId(null)} style={navBtnStyle}>
                  🏠 Root
                </button>
                <button onClick={handleBackToParent} style={navBtnStyle}>
                  ⬅ Back
                </button>
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              setEditMode(false);
              setCatData({ id: null, name: "" });
              setShowCatModal(true);
            }}
            style={primaryBtn}
          >
            + New Folder
          </button>
          {parentId && (
            <button
              onClick={() => {
                setEditMode(false);
                setItemData({
                  id: null,
                  name: "",
                  base_price: "",
                  description: "",
                  main_image: "",
                });
                setShowItemModal(true);
              }}
              style={accentBtn}
            >
              + Add Product Style
            </button>
          )}
        </div>
      </div>

      {/* CATEGORIES GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "40px",
        }}
      >
        {currentCategories.map((cat) => (
          <div key={cat.id} style={folderCard}>
            <h3
              onClick={() => setParentId(cat.id)}
              style={{ cursor: "pointer", color: "#880e4f" }}
            >
              {cat.name}
            </h3>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
              <button
                onClick={() => {
                  setCatData({ id: cat.id, name: cat.name });
                  setEditMode(true);
                  setShowCatModal(true);
                }}
                style={iconBtn}
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Delete folder?"))
                    deleteCategory(cat.id).then(loadCategories);
                }}
                style={{ ...iconBtn, color: "red" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PRODUCTS TABLE */}
      {parentId && (
        <>
          <h3
            style={{ borderBottom: "2px solid #fce4ec", paddingBottom: "10px" }}
          >
            Product Styles
          </h3>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th style={cellStyle}>Name & Description</th>
                <th style={cellStyle}>Base Price</th>
                <th style={cellStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={cellStyle}>
                    <div style={{ fontWeight: "bold" }}>{item.name}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {item.description}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    LKR {parseFloat(item.base_price).toFixed(2)}
                  </td>
                  <td style={cellStyle}>
                    <button
                      onClick={() => {
                        setSelectedProduct(item);
                        setShowVariantModal(true);
                      }}
                      style={variantBtn}
                    >
                      Manage Variants
                    </button>
                    <button
                      onClick={() => {
                        setItemData({
                          ...item,
                          name: item.name || "",
                          base_price: item.base_price || "",
                          description: item.description || "",
                          main_image: item.main_image || "",
                        });
                        setEditMode(true);
                        setShowItemModal(true);
                      }}
                      style={iconBtn}
                    >
                      Edit Style
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* MODAL: CATEGORY (FIXED) */}
      {showCatModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3>{editMode ? "Edit Folder" : "New Folder"}</h3>
            <input
              style={inputStyle}
              value={catData.name}
              onChange={(e) => setCatData({ ...catData, name: e.target.value })}
              placeholder="Folder Name"
              autoFocus
            />
            <button onClick={handleSaveCategory} style={saveBtn}>
              Save
            </button>
            <button onClick={closeModals} style={cancelBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCT STYLE (FIXED) */}
      {showItemModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "400px" }}>
            <h3>{editMode ? "Edit Product Style" : "New Product Style"}</h3>
            <label style={labelStyle}>Product Name</label>
            <input
              style={inputStyle}
              value={itemData.name}
              onChange={(e) =>
                setItemData({ ...itemData, name: e.target.value })
              }
            />

            <label style={labelStyle}>Base Price (LKR)</label>
            <input
              style={inputStyle}
              type="number"
              value={itemData.base_price}
              onChange={(e) =>
                setItemData({ ...itemData, base_price: e.target.value })
              }
            />

            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, height: "60px" }}
              value={itemData.description}
              onChange={(e) =>
                setItemData({ ...itemData, description: e.target.value })
              }
            />

            <button onClick={handleSaveItem} style={saveBtn}>
              Save Style
            </button>
            <button onClick={closeModals} style={cancelBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MODAL: VARIANT MANAGER (FIXED) */}
      {showVariantModal && selectedProduct && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, width: "550px" }}>
            <h3>Variants: {selectedProduct.name}</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <input
                style={inputStyle}
                value={variantData.sku}
                onChange={(e) =>
                  setVariantData({ ...variantData, sku: e.target.value })
                }
                placeholder="SKU"
              />
              <input
                style={inputStyle}
                value={variantData.barcode}
                onChange={(e) =>
                  setVariantData({ ...variantData, barcode: e.target.value })
                }
                placeholder="Barcode"
              />
              <input
                style={inputStyle}
                value={variantData.size}
                onChange={(e) =>
                  setVariantData({ ...variantData, size: e.target.value })
                }
                placeholder="Size"
              />
              <input
                style={inputStyle}
                value={variantData.color}
                onChange={(e) =>
                  setVariantData({ ...variantData, color: e.target.value })
                }
                placeholder="Color"
              />
              <input
                style={inputStyle}
                value={variantData.variant_price}
                onChange={(e) =>
                  setVariantData({
                    ...variantData,
                    variant_price: e.target.value,
                  })
                }
                placeholder="Variant Price"
              />
            </div>
            <button
              onClick={handleSaveVariant}
              style={{ ...saveBtn, marginTop: "15px" }}
            >
              + Add Variant
            </button>
            <button onClick={closeModals} style={cancelBtn}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLES ---
const navBtnStyle = {
  background: "white",
  border: "1px solid #ccc",
  padding: "6px 15px",
  borderRadius: "20px",
  cursor: "pointer",
  fontSize: "13px",
};
const folderCard = {
  border: "2px solid #fce4ec",
  padding: "20px",
  borderRadius: "12px",
  background: "#fff",
  textAlign: "center",
};
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  borderRadius: "8px",
  overflow: "hidden",
};
const cellStyle = {
  padding: "12px 15px",
  textAlign: "left",
  borderBottom: "1px solid #eee",
};
const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};
const modalBox = {
  background: "white",
  padding: "25px",
  borderRadius: "12px",
  width: "350px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};
const inputStyle = {
  padding: "10px",
  border: "1px solid #ddd",
  borderRadius: "5px",
  fontSize: "14px",
  width: "100%",
  boxSizing: "border-box",
};
const labelStyle = {
  fontSize: "12px",
  fontWeight: "bold",
  color: "#555",
  marginTop: "5px",
};
const primaryBtn = {
  background: "#333",
  color: "white",
  padding: "10px 20px",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};
const accentBtn = {
  background: "#e91e63",
  color: "white",
  padding: "10px 20px",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};
const saveBtn = {
  padding: "12px",
  background: "#e91e63",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontWeight: "bold",
};
const cancelBtn = {
  padding: "10px",
  background: "#eee",
  border: "none",
  color: "#333",
  borderRadius: "5px",
  cursor: "pointer",
};
const iconBtn = {
  background: "none",
  border: "1px solid #ddd",
  padding: "4px 8px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "11px",
};
const variantBtn = {
  background: "#fce4ec",
  border: "1px solid #e91e63",
  color: "#880e4f",
  padding: "4px 10px",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "600",
};

export default CategoryManager;
