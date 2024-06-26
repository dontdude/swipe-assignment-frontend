import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import InvoiceItem from "./InvoiceItem";
import InvoiceModal from "./InvoiceModal";
import InputGroup from "react-bootstrap/InputGroup";
import { useDispatch, useSelector } from "react-redux";
import { addInvoice, updateInvoice } from "../redux/invoicesSlice";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import generateRandomId from "../utils/generateRandomId";
import { useInvoiceListData, useProductsListData } from "../redux/hooks";
import { addProduct, updateProduct, updateAllProductRates } from "../redux/productsSlice";
import {
  fetchRates,
  selectRates,
  setCurrency,
} from "../redux/currencySlice";

// Default values from new item
const defaultItem = {
  id: generateRandomId(),
  name: "",
  description: "",
  quantity: 0,
  rate: 0,
};

// Default values for new invoice
const newInvoice = {
  currentDate: new Date().toLocaleDateString(),
  dateOfIssue: "",
  billTo: "",
  billToEmail: "",
  billToAddress: "",
  billFrom: "",
  billFromEmail: "",
  billFromAddress: "",
  notes: "",
  total: "0.00",
  subTotal: "0.00",
  taxRate: "",
  taxAmount: "0.00",
  discountRate: "",
  discountAmount: "0.00",
  currency: "$",
  items: [defaultItem],
};

const InvoiceForm = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isCopy = location.pathname.includes("create");
  const isEdit = location.pathname.includes("edit");

  const [isOpen, setIsOpen] = useState(false);
  const [copyId, setCopyId] = useState("");
  const [oldCurrency, setOldCurrency] = useState("");
  const [newCurrency, setNewCurrency] = useState("");
  const { getOneInvoice, listSize } = useInvoiceListData();
  const [formData, setFormData] = useState(
    isEdit
      ? getOneInvoice(params.id)
      : isCopy && params.id
      ? {
          ...getOneInvoice(params.id),
          invoiceNumber: listSize + 1,
        }
      : { ...newInvoice, invoiceNumber: listSize + 1 }
  );

  const { productsList } = useProductsListData();

  const addedItems = formData.items.map((item) => item.id);
  const availableProducts = productsList.filter(
    (product) => !addedItems.includes(product.id)
  );

  useEffect(() => {
    handleCalculateTotal();
  }, []);

  useEffect(() => {
    setFormData((prevFormData) => {
      const updatedItems = prevFormData.items.map((item) => {
        const updatedProduct = productsList.find((product) => product.id === item.id);
        return updatedProduct ? updatedProduct : item;
      });
      return { ...prevFormData, items: updatedItems };
    });
  }, [productsList]);

  const handleProductSelect = (newId) => {
    setFormData((prevData) => {
      const itemExists = prevData.items.some((item) => item.id === newId);

      if (itemExists) {
        return prevData;
      }

      const newItem = {
        ...productsList.find((product) => product.id === newId),
        quantity: 1,
      };

      return { ...prevData, items: [newItem, ...prevData.items] };
    });
    handleCalculateTotal();
  };

  const handleRowDel = (id) => {
    const updatedItems = formData.items.filter((item) => item.id !== id);
    setFormData({ ...formData, items: updatedItems });
    handleCalculateTotal();
  };

  const lastItemInForm = formData.items[formData.items.length - 1];
  const isDisabled =
    lastItemInForm.name === "" || lastItemInForm.quantity === 0;

  const handleAddEvent = () => {
    if (isDisabled) return;
    const currentProduct = {
      id: lastItemInForm.id,
      name: lastItemInForm.name,
      description: lastItemInForm.description,
      rate: lastItemInForm.rate,
      quantity: lastItemInForm.quantity,
    };
    dispatch(addProduct(currentProduct));
    setFormData({
      ...formData,
      items: [...formData.items, { ...defaultItem, id: generateRandomId() }],
    });
    handleCalculateTotal();
  };

  const handleCalculateTotal = () => {
    setFormData((prevFormData) => {
      let subTotal = 0;
      console.log({ prevFormData });
      prevFormData.items.forEach((item) => {
        subTotal += parseFloat(item.rate).toFixed(2) * parseInt(item.quantity);
      });

      const taxAmount = parseFloat(
        (subTotal * (prevFormData.taxRate / 100)).toFixed(2)
      );
      const discountAmount = parseFloat(
        (subTotal * (prevFormData.discountRate / 100)).toFixed(2)
      );
      const total = parseFloat(
        (subTotal -
        parseFloat(discountAmount) +
        parseFloat(taxAmount)).toFixed(2)
      );

      return {
        ...prevFormData,
        subTotal,
        taxAmount,
        discountAmount,
        total,
      };
    });
  };

  const onItemizedItemEdit = (evt, id) => {
    const updatedItems = formData.items.map((oldItem) => {
      if (oldItem.id === id) {
        return { ...oldItem, [evt.target.name]: evt.target.value };
      }
      return oldItem;
    });

    setFormData({ ...formData, items: updatedItems });
    handleCalculateTotal();
  };

  const editField = (name, value) => {
    setFormData({ ...formData, [name]: value });
    handleCalculateTotal();
  };

  useEffect(() => {
    dispatch(fetchRates());
  }, [dispatch]);

  const rates = useSelector(selectRates);

  const currencyCodesToSymbols = {
    "USD": "$",
    "GBP": "£",
    "JPY": "¥",
    "CAD": "$",
    "AUD": "$",
    "SGD": "$",
    "CNY": "¥",
    "BTC": "₿"
  };

  const onCurrencyChange = (selectedOption) => {
    const oldCurr = formData.currency;
    const oldCurrCode = Object.keys(currencyCodesToSymbols).find(
      (key) => currencyCodesToSymbols[key] === oldCurr
    );
    setOldCurrency(oldCurr);

    const newCurrCode = selectedOption.currencyCode;
    const newCurr = currencyCodesToSymbols[newCurrCode];

    dispatch(setCurrency(newCurr));
    setNewCurrency(newCurr);
    const rateRatio = rates[newCurrCode] / rates[oldCurrCode];
    console.log("hv30", { formData })
    setFormData({
      ...formData,
      currency: newCurr,
      items: formData.items.map(item => ({
        ...item,
        rate: item.rate * rateRatio
      }))
    });
    console.log("hv2", { rateRatio, newCurr, oldCurr, oldCurrCode, newCurrCode});
    dispatch(updateAllProductRates({ ratio: rateRatio, currency: newCurr }));
    console.log("hv31", { formData })
    handleCalculateTotal();
    console.log("hv32", { formData })
  };

  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    console.log("hv1", { rates, fromCurrency, toCurrency });
    const rate = rates[toCurrency] / rates[fromCurrency];
    return (amount * rate).toFixed(2);
  };

  const openModal = (event) => {
    event.preventDefault();
    handleCalculateTotal();
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const handleAddInvoice = () => {
    formData.items.forEach((item) => {
      if (item.id !== 0) {
        const { id, name, description, rate } = item;
        dispatch(updateProduct({ id, name, description, rate }));
      }
    });

    if (isEdit) {
      dispatch(updateInvoice({ id: params.id, updatedInvoice: formData }));
      alert("Invoice updated successfuly 🥳");
    } else if (isCopy) {
      dispatch(addInvoice({ id: generateRandomId(), ...formData }));
      alert("Invoice added successfuly 🥳");
    } else {
      dispatch(addInvoice(formData));
      alert("Invoice added successfuly 🥳");
    }
    navigate("/");
  };

  const handleCopyInvoice = () => {
    const recievedInvoice = getOneInvoice(copyId);
    if (recievedInvoice) {
      setFormData({
        ...recievedInvoice,
        id: formData.id,
        invoiceNumber: formData.invoiceNumber,
      });
    } else {
      alert("Invoice does not exists!!!!!");
    }
  };

  return (
    <Form onSubmit={openModal}>
      <Row>
        <Col md={8} lg={9}>
          <Card className="p-4 p-xl-5 my-3 my-xl-4">
            <div className="d-flex flex-row align-items-start justify-content-between mb-3">
              <div className="d-flex flex-column">
                <div className="d-flex flex-column">
                  <div className="mb-2">
                    <span className="fw-bold">Current&nbsp;Date:&nbsp;</span>
                    <span className="current-date">{formData.currentDate}</span>
                  </div>
                </div>
                <div className="d-flex flex-row align-items-center">
                  <span className="fw-bold d-block me-2">Due&nbsp;Date:</span>
                  <Form.Control
                    type="date"
                    value={formData.dateOfIssue}
                    name="dateOfIssue"
                    onChange={(e) => editField(e.target.name, e.target.value)}
                    style={{ maxWidth: "150px" }}
                    required
                  />
                </div>
              </div>
              <div className="d-flex flex-row align-items-center">
                <span className="fw-bold me-2">Invoice&nbsp;Number:&nbsp;</span>
                <Form.Control
                  type="number"
                  value={formData.invoiceNumber}
                  name="invoiceNumber"
                  onChange={(e) => editField(e.target.name, e.target.value)}
                  min="1"
                  style={{ maxWidth: "70px" }}
                  required
                />
              </div>
            </div>
            <hr className="my-4" />
            <Row className="mb-5">
              <Col>
                <Form.Label className="fw-bold">Bill to:</Form.Label>
                <Form.Control
                  placeholder="Who is this invoice to?"
                  rows={3}
                  value={formData.billTo}
                  type="text"
                  name="billTo"
                  className="my-2"
                  onChange={(e) => editField(e.target.name, e.target.value)}
                  autoComplete="name"
                  required
                />
                <Form.Control
                  placeholder="Email address"
                  value={formData.billToEmail}
                  type="email"
                  name="billToEmail"
                  className="my-2"
                  onChange={(e) => editField(e.target.name, e.target.value)}
                  autoComplete="email"
                  required
                />
                <Form.Control
                  placeholder="Billing address"
                  value={formData.billToAddress}
                  type="text"
                  name="billToAddress"
                  className="my-2"
                  autoComplete="address"
                  onChange={(e) => editField(e.target.name, e.target.value)}
                  required
                />
              </Col>
              <Col>
                <Form.Label className="fw-bold">Bill from:</Form.Label>
                <Form.Control
                  placeholder="Who is this invoice from?"
                  rows={3}
                  value={formData.billFrom}
                  type="text"
                  name="billFrom"
                  className="my-2"
                  onChange={(e) => editField(e.target.name, e.target.value)}
                  autoComplete="name"
                  required
                />
                <Form.Control
                  placeholder="Email address"
                  value={formData.billFromEmail}
                  type="email"
                  name="billFromEmail"
                  className="my-2"
                  onChange={(e) => editField(e.target.name, e.target.value)}
                  autoComplete="email"
                  required
                />
                <Form.Control
                  placeholder="Billing address"
                  value={formData.billFromAddress}
                  type="text"
                  name="billFromAddress"
                  className="my-2"
                  autoComplete="address"
                  onChange={(e) => editField(e.target.name, e.target.value)}
                  required
                />
              </Col>
            </Row>
            <InvoiceItem
              onProductSelect={handleProductSelect}
              onItemizedItemEdit={onItemizedItemEdit}
              onRowAdd={handleAddEvent}
              onRowDel={handleRowDel}
              currency={formData.currency}
              items={formData.items}
              products={availableProducts}
              isDisabled={isDisabled}
              convertCurrency={convertCurrency}
              oldCurrency={oldCurrency}
              newCurrency={newCurrency}
            />
            <Row className="mt-4 justify-content-end">
              <Col lg={6}>
                <div className="d-flex flex-row align-items-start justify-content-between">
                  <span className="fw-bold">Subtotal:</span>
                  <span>
                    {formData.currency}
                    {formData.subTotal}
                  </span>
                </div>
                <div className="d-flex flex-row align-items-start justify-content-between mt-2">
                  <span className="fw-bold">Discount:</span>
                  <span>
                    <span className="small">
                      ({formData.discountRate || 0}%)
                    </span>
                    {formData.currency}
                    {formData.discountAmount || 0}
                  </span>
                </div>
                <div className="d-flex flex-row align-items-start justify-content-between mt-2">
                  <span className="fw-bold">Tax:</span>
                  <span>
                    <span className="small">({formData.taxRate || 0}%)</span>
                    {formData.currency}
                    {formData.taxAmount || 0}
                  </span>
                </div>
                <hr />
                <div
                  className="d-flex flex-row align-items-start justify-content-between"
                  style={{ fontSize: "1.125rem" }}
                >
                  <span className="fw-bold">Total:</span>
                  <span className="fw-bold">
                    {formData.currency}
                    {formData.total || 0}
                  </span>
                </div>
              </Col>
            </Row>
            <hr className="my-4" />
            <Form.Label className="fw-bold">Notes:</Form.Label>
            <Form.Control
              placeholder="Thanks for your business!"
              name="notes"
              value={formData.notes}
              onChange={(e) => editField(e.target.name, e.target.value)}
              as="textarea"
              className="my-2"
              rows={1}
            />
          </Card>
        </Col>
        <Col md={4} lg={3}>
          <div className="sticky-top pt-md-3 pt-xl-4">
            <Button
              variant="dark"
              onClick={handleAddInvoice}
              className="d-block w-100 mb-2"
            >
              {isEdit ? "Update Invoice" : "Add Invoice"}
            </Button>
            <Button variant="primary" type="submit" className="d-block w-100">
              Review Invoice
            </Button>
            <InvoiceModal
              showModal={isOpen}
              closeModal={closeModal}
              info={{
                isOpen,
                id: formData.id,
                currency: formData.currency,
                currentDate: formData.currentDate,
                invoiceNumber: formData.invoiceNumber,
                dateOfIssue: formData.dateOfIssue,
                billTo: formData.billTo,
                billToEmail: formData.billToEmail,
                billToAddress: formData.billToAddress,
                billFrom: formData.billFrom,
                billFromEmail: formData.billFromEmail,
                billFromAddress: formData.billFromAddress,
                notes: formData.notes,
                total: formData.total,
                subTotal: formData.subTotal,
                taxRate: formData.taxRate,
                taxAmount: formData.taxAmount,
                discountRate: formData.discountRate,
                discountAmount: formData.discountAmount,
              }}
              items={formData.items}
              currency={formData.currency}
              subTotal={formData.subTotal}
              taxAmount={formData.taxAmount}
              discountAmount={formData.discountAmount}
              total={formData.total}
            />
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Currency:</Form.Label>
              <Form.Select
                onChange={(event) =>
                  onCurrencyChange({ currencyCode: event.target.value })
                }
                className="btn btn-light my-1"
                aria-label="Change Currency"
              >
                <option value="USD">USD (United States Dollar)</option>
                <option value="GBP">GBP (British Pound Sterling)</option>
                <option value="JPY">JPY (Japanese Yen)</option>
                <option value="CAD">CAD (Canadian Dollar)</option>
                <option value="AUD">AUD (Australian Dollar)</option>
                <option value="SGD">SGD (Singapore Dollar)</option>
                <option value="CNY">CNY (Chinese Renminbi)</option>
                <option value="BTC">BTC (Bitcoin)</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="my-3">
              <Form.Label className="fw-bold">Tax rate:</Form.Label>
              <InputGroup className="my-1 flex-nowrap">
                <Form.Control
                  name="taxRate"
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => editField(e.target.name, e.target.value)}
                  className="bg-white border"
                  placeholder="0.0"
                  min="0.00"
                  step="0.01"
                  max="100.00"
                />
                <InputGroup.Text className="bg-light fw-bold text-secondary small">
                  %
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>
            <Form.Group className="my-3">
              <Form.Label className="fw-bold">Discount rate:</Form.Label>
              <InputGroup className="my-1 flex-nowrap">
                <Form.Control
                  name="discountRate"
                  type="number"
                  value={formData.discountRate}
                  onChange={(e) => editField(e.target.name, e.target.value)}
                  className="bg-white border"
                  placeholder="0.0"
                  min="0.00"
                  step="0.01"
                  max="100.00"
                />
                <InputGroup.Text className="bg-light fw-bold text-secondary small">
                  %
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>

            <Form.Control
              placeholder="Enter Invoice ID"
              name="copyId"
              value={copyId}
              onChange={(e) => setCopyId(e.target.value)}
              type="text"
              className="my-2 bg-white border"
            />
            <Button
              variant="primary"
              onClick={handleCopyInvoice}
              className="d-block"
            >
              Copy Old Invoice
            </Button>
          </div>
        </Col>
      </Row>
    </Form>
  );
};

export default InvoiceForm;
