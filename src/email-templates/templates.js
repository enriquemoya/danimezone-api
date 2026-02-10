const React = require("react");
const { render } = require("@react-email/render");

const STATUS_LABELS = {
  es: {
    CREATED: "Creado",
    PENDING_PAYMENT: "Pago pendiente",
    PAID: "Pagado",
    READY_FOR_PICKUP: "Listo para recoger",
    SHIPPED: "Enviado",
    CANCELLED_EXPIRED: "Cancelado por expiracion",
    CANCELLED_MANUAL: "Cancelado manualmente",
    CANCELED: "Cancelado manualmente"
  },
  en: {
    CREATED: "Created",
    PENDING_PAYMENT: "Pending payment",
    PAID: "Paid",
    READY_FOR_PICKUP: "Ready for pickup",
    SHIPPED: "Shipped",
    CANCELLED_EXPIRED: "Cancelled (expired)",
    CANCELLED_MANUAL: "Cancelled manually",
    CANCELED: "Cancelled manually"
  }
};

function normalizeLocale(value) {
  return value === "en" ? "en" : "es";
}

function resolveStatusLabel(locale, status) {
  const bucket = STATUS_LABELS[normalizeLocale(locale)];
  return bucket[status] || status;
}

function money(amount, currency) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return `0 ${currency || "MXN"}`;
  }
  return `${currency || "MXN"} ${amount.toFixed(2)}`;
}

function BaseLayout(props) {
  return React.createElement(
    "div",
    {
      style: {
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#0b1020",
        color: "#f8fafc",
        padding: "24px"
      }
    },
    React.createElement(
      "div",
      {
        style: {
          maxWidth: "560px",
          margin: "0 auto",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "12px",
          overflow: "hidden",
          backgroundColor: "#111a2e"
        }
      },
      React.createElement(
        "div",
        { style: { padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)" } },
        React.createElement("h2", { style: { margin: 0, fontSize: "20px" } }, props.title)
      ),
      React.createElement("div", { style: { padding: "20px", lineHeight: "1.5" } }, props.children)
    )
  );
}

function OrderCreatedTemplate(props) {
  const locale = normalizeLocale(props.locale);
  const labels = locale === "en"
    ? {
        intro: "Your order was created successfully.",
        orderId: "Order ID",
        status: "Status",
        total: "Subtotal",
        expires: "Expires at",
        branch: "Pickup branch",
        fallbackBranch: "Not assigned"
      }
    : {
        intro: "Tu pedido fue creado correctamente.",
        orderId: "ID de pedido",
        status: "Estado",
        total: "Subtotal",
        expires: "Expira",
        branch: "Sucursal de retiro",
        fallbackBranch: "Sin asignar"
      };

  return React.createElement(
    BaseLayout,
    { title: locale === "en" ? "Order created" : "Pedido creado" },
    React.createElement("p", null, labels.intro),
    React.createElement("p", null, `${labels.orderId}: ${props.orderId}`),
    React.createElement("p", null, `${labels.status}: ${resolveStatusLabel(locale, props.status)}`),
    React.createElement("p", null, `${labels.total}: ${money(props.subtotal, props.currency)}`),
    React.createElement("p", null, `${labels.expires}: ${props.expiresAt || "-"}`),
    React.createElement("p", null, `${labels.branch}: ${props.pickupBranchName || labels.fallbackBranch}`)
  );
}

function OrderStatusUpdatedTemplate(props) {
  const locale = normalizeLocale(props.locale);
  const labels = locale === "en"
    ? {
        intro: "Your order status has changed.",
        orderId: "Order ID",
        from: "Previous status",
        to: "Current status",
        reason: "Reason",
        fallbackReason: "No additional details"
      }
    : {
        intro: "El estado de tu pedido cambio.",
        orderId: "ID de pedido",
        from: "Estado anterior",
        to: "Estado actual",
        reason: "Motivo",
        fallbackReason: "Sin detalles adicionales"
      };

  return React.createElement(
    BaseLayout,
    { title: locale === "en" ? "Order status updated" : "Actualizacion de pedido" },
    React.createElement("p", null, labels.intro),
    React.createElement("p", null, `${labels.orderId}: ${props.orderId}`),
    React.createElement("p", null, `${labels.from}: ${resolveStatusLabel(locale, props.fromStatus || "CREATED")}`),
    React.createElement("p", null, `${labels.to}: ${resolveStatusLabel(locale, props.toStatus)}`),
    React.createElement("p", null, `${labels.reason}: ${props.reason || labels.fallbackReason}`)
  );
}

function renderOrderCreatedEmail(params) {
  const locale = normalizeLocale(params.locale);
  const subject = locale === "en"
    ? `Order created: ${params.orderId}`
    : `Pedido creado: ${params.orderId}`;
  const html = render(React.createElement(OrderCreatedTemplate, params));
  const text = locale === "en"
    ? `Your order ${params.orderId} was created with status ${resolveStatusLabel(locale, params.status)}.`
    : `Tu pedido ${params.orderId} fue creado con estado ${resolveStatusLabel(locale, params.status)}.`;
  return { subject, html, text };
}

function renderOrderStatusUpdatedEmail(params) {
  const locale = normalizeLocale(params.locale);
  const subject = locale === "en"
    ? `Order update: ${params.orderId}`
    : `Actualizacion de pedido: ${params.orderId}`;
  const html = render(React.createElement(OrderStatusUpdatedTemplate, params));
  const text = locale === "en"
    ? `Order ${params.orderId} changed to ${resolveStatusLabel(locale, params.toStatus)}.`
    : `El pedido ${params.orderId} cambio a ${resolveStatusLabel(locale, params.toStatus)}.`;
  return { subject, html, text };
}

module.exports = {
  renderOrderCreatedEmail,
  renderOrderStatusUpdatedEmail
};
