import { useMemo, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog";

/*
STAND: stabilste & weiteste Version
➡️ NUR ERGÄNZT, nichts entfernt
*/

const DEFAULT_TAX_NOTICE = "Gemäß §19 UStG wird keine Umsatzsteuer berechnet.";

export default function App() {
  const exportInvoicePDF = (invoice) => {
    const content = `Rechnung ${invoice.invoiceNumber}\n\n${invoice.companyName}\n${invoice.companyAddress}\n${invoice.companyContact}\nSteuernummer/USt-ID: ${invoice.taxId}\n\nRechnungsdatum: ${formatDate(invoice.createdAt)}\nFällig am: ${formatDate(invoice.dueDate)}\n\nAuftragsnummer: ${invoice.orderNumber}\nKunde: ${invoice.customer}\nLeistung: ${invoice.service}\nArbeitszeit: ${invoice.hours} Std.\nGesamt: ${formatCurrency(invoice.total)}\n\n${invoice.taxNotice}\n\nZahlung an: ${invoice.bankInfo}`;
    const win = window.open("", "", "width=600,height=400");
    if (!win) return;
    win.document.write(`<pre>${content}</pre>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  /* LOGIN */
  const [user, setUser] = useState(null);
  const USERS = [
    { username: "admin", password: "admin" },
    { username: "mitarbeiter", password: "1234" }
  ];

  /* GLOBAL STATE */
  const [view, setView] = useState("dashboard");
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDialog, setInvoiceDialog] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(null);

  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchOrder, setSearchOrder] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");

  const [settings, setSettings] = useState({
    companyName: "",
    street: "",
    zip: "",
    city: "",
    phone: "",
    email: "",
    taxId: "",
    bankName: "",
    iban: "",
    bic: "",
    hourlyRate: 60,
    taxNotice: DEFAULT_TAX_NOTICE,
    services: [
      { name: "Innenreinigung", price: 80 },
      { name: "Außenaufbereitung", price: 120 },
      { name: "Komplettpaket", price: 180 }
    ]
  });

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, i) => sum + i.total, 0);
    const paid = invoices.filter((i) => i.paid).reduce((sum, i) => sum + i.total, 0);
    const open = total - paid;
    return {
      total,
      paid,
      open,
      invoices: invoices.length,
      customers: customers.length,
      orders: orders.length
    };
  }, [invoices, customers, orders]);

  /* HILFSFUNKTION */
  const log = (action) => {
    if (!user) return;
    setAuditLog((l) => [
      ...l,
      { time: new Date().toLocaleString("de-DE"), user: user.username, action }
    ]);
  };

  const generateOrderNumber = () => Math.floor(100000 + Math.random() * 900000);
  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const index = String(invoices.length + 1).padStart(4, "0");
    return `RE-${year}-${index}`;
  };

  const companyAddress = `${settings.street} ${settings.zip} ${settings.city}`.trim();
  const companyContact = `${settings.phone} · ${settings.email}`.trim();
  const bankInfo = [settings.bankName, settings.iban, settings.bic].filter(Boolean).join(" | ");

  /* CRUD */
  const addCustomer = (c) => {
    setCustomers([...customers, { ...c, id: Date.now() }]);
    log(`Kunde angelegt: ${c.firstname} ${c.lastname}`);
  };

  const addOrder = (o) => {
    const orderNumber = generateOrderNumber();
    const service = settings.services.find((s) => s.name === o.service);
    setOrders([
      ...orders,
      {
        ...o,
        id: Date.now(),
        orderNumber,
        status: "Offen",
        servicePrice: service?.price ?? settings.hourlyRate
      }
    ]);
    log(`Auftrag angelegt: ${o.title} (${orderNumber})`);
  };

  const markOrderDone = (order) => {
    setOrders(
      orders.map((o) =>
        o.id === order.id ? { ...o, status: "Erledigt" } : o
      )
    );
    log(`Auftrag erledigt: ${order.title}`);
    setInvoiceDialog(order);
  };

  const createInvoice = (order, hours) => {
    const total = hours * settings.hourlyRate;
    const createdAt = new Date().toISOString();
    const dueDate = addDays(new Date(), 14).toISOString();
    setInvoices([
      ...invoices,
      {
        id: Date.now(),
        invoiceNumber: generateInvoiceNumber(),
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        service: order.service,
        hours,
        total,
        createdAt,
        dueDate,
        paid: false,
        paymentAmount: 0,
        paymentDate: null,
        paymentMethod: "",
        companyName: settings.companyName,
        companyAddress,
        companyContact,
        taxId: settings.taxId,
        taxNotice: settings.taxNotice,
        bankInfo
      }
    ]);
    log(`Rechnung erstellt für Auftrag: ${order.title}`);
    setInvoiceDialog(null);
  };

  const markInvoicePaid = (invoice, payload) => {
    setInvoices(
      invoices.map((i) =>
        i.id === invoice.id
          ? {
            ...i,
            paid: true,
            paymentAmount: payload.amount,
            paymentDate: payload.date,
            paymentMethod: payload.method
          }
          : i
      )
    );
    log(`Zahlung erfasst für Rechnung: ${invoice.invoiceNumber}`);
    setPaymentDialog(null);
  };

  /* LOGIN */
  if (!user) return <Login users={USERS} onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-rose-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-white/80 shadow-lg shadow-slate-200/60 border border-white/60 backdrop-blur p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Willkommen zurück, {user.username} ✨</p>
              <h1 className="text-3xl font-bold text-slate-900">Rechnungen & Aufträge im Griff</h1>
              <p className="text-sm text-slate-500">{settings.companyName || "Dein Unternehmen"} · Kleinunternehmer-Workflow 💼</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setView("settings")}>Einstellungen</Button>
              <Button onClick={() => setUser(null)}>Logout</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Umsatz gesamt" value={formatCurrency(stats.total)} />
            <StatCard label="Eingänge" value={formatCurrency(stats.paid)} />
            <StatCard label="Offen" value={formatCurrency(stats.open)} />
            <StatCard label="Offene Rechnungen" value={`${stats.invoices}`} />
          </div>
        </header>

        <nav className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Tile title="🏠 Dashboard" active={view === "dashboard"} onClick={() => setView("dashboard")} />
          <Tile title="👥 Kunden" active={view === "customers"} onClick={() => setView("customers")} />
          <Tile title="🧾 Aufträge" active={view === "orders"} onClick={() => setView("orders")} />
          <Tile title="🗓️ Termine" active={view === "calendar"} onClick={() => setView("calendar")} />
          <Tile title="📄 Rechnungen" active={view === "invoices"} onClick={() => setView("invoices")} />
          <Tile title="💳 Zahlungseingänge" active={view === "payments"} onClick={() => setView("payments")} />
          <Tile title="📊 Steuerübersicht" active={view === "tax"} onClick={() => setView("tax")} />
          <Tile title="🕒 Protokoll" active={view === "audit"} onClick={() => setView("audit")} />
        </nav>

        {view === "dashboard" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="space-y-3">
                <h2 className="text-lg font-semibold">🚀 Schnellstart</h2>
                <p className="text-sm text-slate-500">
                  Lege zuerst Kunden an, erstelle danach Aufträge und rechnest diese mit dem
                  Kleinunternehmer-Hinweis ab. Zahlungen werden im Bereich Zahlungseingänge erfasst.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setView("customers")}>Kunde anlegen</Button>
                  <Button variant="outline" onClick={() => setView("orders")}>Auftrag erstellen</Button>
                  <Button variant="outline" onClick={() => setView("invoices")}>Rechnung prüfen</Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3">
                <h2 className="text-lg font-semibold">✅ Kleinunternehmer-Check</h2>
                <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                  <li>Rechnungen mit §19 UStG Hinweis</li>
                  <li>Umsatzübersicht für Steuererklärung</li>
                  <li>Zahlungseingänge getrennt nach offen/bezahlt</li>
                  <li>Protokoll aller Änderungen</li>
                </ul>
                <Button variant="outline" onClick={() => setView("tax")}>Steuerübersicht öffnen</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {view === "customers" && (
          <Section title="👥 Kundendaten verwalten" subtitle="Stammdaten für Rechnungen und Aufträge" back={() => setView("dashboard")}>
            <CustomerForm onAdd={addCustomer} />
            <Input placeholder="Suche Kunde" value={searchCustomer} onChange={(e) => setSearchCustomer(e.target.value)} />
            <div className="grid gap-3 md:grid-cols-2">
              {customers
                .filter((c) =>
                  `${c.firstname} ${c.lastname}`
                    .toLowerCase()
                    .includes(searchCustomer.toLowerCase())
                )
                .map((c) => (
                  <Card key={c.id} className="p-3 cursor-pointer hover:shadow" onClick={() => setSelectedCustomer(c)}>
                    <div className="font-semibold">{c.firstname} {c.lastname}</div>
                    <div className="text-sm text-gray-500">{c.city}</div>
                  </Card>
                ))}
            </div>
          </Section>
        )}

        {view === "orders" && (
          <Section title="🧾 Aufträge steuern" subtitle="Aufträge planen, priorisieren und abschließen" back={() => setView("dashboard")}>
            <OrderForm customers={customers} services={settings.services} onAdd={addOrder} />
            <Input placeholder="Auftragsnummer suchen" value={searchOrder} onChange={(e) => setSearchOrder(e.target.value)} />
            <div className="grid gap-3 md:grid-cols-2">
              {orders
                .filter((o) => String(o.orderNumber).includes(searchOrder))
                .map((o) => (
                  <Card key={o.id} className={`p-3 cursor-pointer ${priorityColor(o.priority)}`} onClick={() => setSelectedOrder(o)}>
                    <div className="font-semibold">{o.orderNumber} – {o.title}</div>
                    <div className={statusColor(o.status)}>Status: {o.status}</div>
                    <div className="text-sm text-slate-600">{o.customer} · {o.service}</div>
                  </Card>
                ))}
            </div>
          </Section>
        )}

        {view === "calendar" && (
          <Section title="🗓️ Terminkalender" back={() => setView("dashboard")}>
            {orders.filter((o) => o.date).map((o) => (
              <div key={o.id}>{o.date} – {o.orderNumber}</div>
            ))}
          </Section>
        )}

        {view === "invoices" && (
          <Section title="📄 Rechnungen" subtitle="Rechnungserstellung inkl. Kleinunternehmer-Hinweis" back={() => setView("dashboard")}>
            <Input placeholder="Rechnung suchen (Auftragsnr./Rechnungsnr.)" value={searchInvoice} onChange={(e) => setSearchInvoice(e.target.value)} />
            <div className="grid gap-3 md:grid-cols-2">
              {invoices
                .filter((i) => String(i.orderNumber).includes(searchInvoice) || String(i.invoiceNumber).includes(searchInvoice))
                .map((i) => (
                  <Card key={i.id} className="p-3 cursor-pointer hover:shadow" onClick={() => setSelectedInvoice(i)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{i.invoiceNumber}</div>
                        <div className="text-sm text-slate-600">Auftrag {i.orderNumber} · {i.customer}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(i.total)}</div>
                        <div className={`text-xs ${i.paid ? "text-green-600" : "text-amber-600"}`}>
                          {i.paid ? "Bezahlt" : "Offen"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">Fällig: {formatDate(i.dueDate)}</div>
                  </Card>
                ))}
            </div>
          </Section>
        )}

        {view === "payments" && (
          <Section title="💳 Zahlungseingänge" subtitle="Erfasse bezahlte Rechnungen und überwache offene Posten" back={() => setView("dashboard")}>
            <div className="grid gap-3 md:grid-cols-2">
              {invoices.map((i) => (
                <Card key={i.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{i.invoiceNumber}</div>
                      <div className="text-sm text-slate-600">{i.customer}</div>
                      <div className="text-xs text-slate-500">Fällig: {formatDate(i.dueDate)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(i.total)}</div>
                      <div className={`text-xs ${i.paid ? "text-green-600" : "text-amber-600"}`}>
                        {i.paid ? `Bezahlt am ${formatDate(i.paymentDate)}` : "Offen"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!i.paid ? (
                      <Button size="sm" onClick={() => setPaymentDialog(i)}>Zahlung erfassen</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(i)}>Rechnung ansehen</Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Section>
        )}

        {view === "tax" && (
          <Section title="📊 Steuerübersicht" subtitle="Umsatz, offene Posten und Kleinunternehmer-Hinweis" back={() => setView("dashboard")}>
            <div className="grid gap-3 md:grid-cols-3">
              <Card><CardContent className="space-y-1"><div className="text-sm text-slate-500">Gesamtumsatz</div><div className="text-xl font-semibold">{formatCurrency(stats.total)}</div></CardContent></Card>
              <Card><CardContent className="space-y-1"><div className="text-sm text-slate-500">Bereits bezahlt</div><div className="text-xl font-semibold">{formatCurrency(stats.paid)}</div></CardContent></Card>
              <Card><CardContent className="space-y-1"><div className="text-sm text-slate-500">Offene Forderungen</div><div className="text-xl font-semibold">{formatCurrency(stats.open)}</div></CardContent></Card>
            </div>
            <Card>
              <CardContent className="space-y-2">
                <h3 className="font-semibold">Kleinunternehmer-Hinweis auf Rechnungen</h3>
                <p className="text-sm text-slate-600">Aktueller Hinweistext:</p>
                <p className="text-sm bg-slate-50 border rounded p-3">{settings.taxNotice}</p>
                <p className="text-xs text-slate-500">Dieser Hinweis wird auf jeder Rechnung ausgegeben und im PDF-Export übernommen.</p>
              </CardContent>
            </Card>
          </Section>
        )}

        {view === "settings" && (
          <Section title="⚙️ Einstellungen" subtitle="Unternehmensdaten für Rechnungen und Zahlungen" back={() => setView("dashboard")}>
            <div className="grid gap-2 md:grid-cols-2">
              <Input placeholder="Firmenname" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
              <Input placeholder="Straße" value={settings.street} onChange={(e) => setSettings({ ...settings, street: e.target.value })} />
              <Input placeholder="PLZ" value={settings.zip} onChange={(e) => setSettings({ ...settings, zip: e.target.value })} />
              <Input placeholder="Ort" value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} />
              <Input placeholder="Telefon" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
              <Input placeholder="E-Mail" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
              <Input placeholder="Steuernummer / USt-ID" value={settings.taxId} onChange={(e) => setSettings({ ...settings, taxId: e.target.value })} />
              <Input type="number" placeholder="Stundenlohn" value={settings.hourlyRate} onChange={(e) => setSettings({ ...settings, hourlyRate: Number(e.target.value) })} />
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Bankname" value={settings.bankName} onChange={(e) => setSettings({ ...settings, bankName: e.target.value })} />
              <Input placeholder="IBAN" value={settings.iban} onChange={(e) => setSettings({ ...settings, iban: e.target.value })} />
              <Input placeholder="BIC" value={settings.bic} onChange={(e) => setSettings({ ...settings, bic: e.target.value })} />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Kleinunternehmer-Hinweis</h3>
              <Textarea value={settings.taxNotice} onChange={(e) => setSettings({ ...settings, taxNotice: e.target.value })} />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Leistungen</h3>
              {settings.services.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={s.name} onChange={(e) => {
                    const copy = [...settings.services];
                    copy[i].name = e.target.value;
                    setSettings({ ...settings, services: copy });
                  }} />
                  <Input type="number" value={s.price} onChange={(e) => {
                    const copy = [...settings.services];
                    copy[i].price = Number(e.target.value);
                    setSettings({ ...settings, services: copy });
                  }} />
                </div>
              ))}
              <Button variant="outline" onClick={() => setSettings({ ...settings, services: [...settings.services, { name: "", price: 0 }] })}>Leistung hinzufügen</Button>
            </div>
          </Section>
        )}

        {view === "audit" && (
          <Section title="🕒 Änderungsprotokoll" subtitle="Übersicht über alle Aktionen" back={() => setView("dashboard")}> 
            {auditLog.map((a, i) => (
              <div key={i} className="text-sm">[{a.time}] {a.user}: {a.action}</div>
            ))}
          </Section>
        )}

        {selectedCustomer && (
          <Dialog open onOpenChange={() => setSelectedCustomer(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Kundendetails</DialogTitle></DialogHeader>
              <div className="space-y-1">
                <div className="font-semibold">{selectedCustomer.firstname} {selectedCustomer.lastname}</div>
                <div>{selectedCustomer.street} {selectedCustomer.houseNumber}</div>
                <div>{selectedCustomer.zip} {selectedCustomer.city}</div>
                <div>{selectedCustomer.phone}</div>
                <div>{selectedCustomer.email}</div>
                <div>Kennzeichen: {selectedCustomer.plate}</div>
                <div>Kommentar: {selectedCustomer.comment}</div>
              </div>
              <h4 className="font-semibold mt-2">Rechnungen</h4>
              {invoices.filter(i => i.customer === `${selectedCustomer.firstname} ${selectedCustomer.lastname}`).map(i => (
                <div key={i.id} className="text-sm cursor-pointer underline" onClick={() => setSelectedInvoice(i)}>
                  Rechnung {i.invoiceNumber} – {formatCurrency(i.total)}
                </div>
              ))}
            </DialogContent>
          </Dialog>
        )}

        {selectedOrder && (
          <Dialog open onOpenChange={() => setSelectedOrder(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Auftrag</DialogTitle></DialogHeader>
              <div className="space-y-1">
                <div>{selectedOrder.orderNumber}</div>
                <div>{selectedOrder.title}</div>
                <div className="text-sm text-slate-600">{selectedOrder.customer} · {selectedOrder.service}</div>
                <div>Status: {selectedOrder.status}</div>
              </div>
              {selectedOrder.status !== "Erledigt" && (
                <Button onClick={() => { markOrderDone(selectedOrder); setSelectedOrder(null); }}>Als erledigt markieren</Button>
              )}
            </DialogContent>
          </Dialog>
        )}

        {invoiceDialog && (
          <InvoiceDialog order={invoiceDialog} hourlyRate={settings.hourlyRate} taxNotice={settings.taxNotice} onCreate={createInvoice} />
        )}

        {paymentDialog && (
          <PaymentDialog invoice={paymentDialog} onClose={() => setPaymentDialog(null)} onSave={markInvoicePaid} />
        )}

        {selectedInvoice && (
          <Dialog open onOpenChange={() => setSelectedInvoice(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Rechnung</DialogTitle></DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-base">{selectedInvoice.invoiceNumber}</div>
                <div>Auftragsnummer: {selectedInvoice.orderNumber}</div>
                <div>Kunde: {selectedInvoice.customer}</div>
                <div>Leistung: {selectedInvoice.service}</div>
                <div>Arbeitszeit: {selectedInvoice.hours} Std.</div>
                <div>Gesamt: {formatCurrency(selectedInvoice.total)}</div>
                <div>Rechnungsdatum: {formatDate(selectedInvoice.createdAt)}</div>
                <div>Fällig am: {formatDate(selectedInvoice.dueDate)}</div>
                {selectedInvoice.taxId && <div>Steuernummer/USt-ID: {selectedInvoice.taxId}</div>}
                <div className="text-xs text-slate-500">{selectedInvoice.taxNotice}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => exportInvoicePDF(selectedInvoice)}>Als PDF exportieren</Button>
                {!selectedInvoice.paid && (
                  <Button variant="outline" onClick={() => setPaymentDialog(selectedInvoice)}>Zahlung erfassen</Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

/* KOMPONENTEN */

function Login({ users, onLogin }) {
  const [u, setU] = useState({});
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-rose-50 p-10">
      <Card className="max-w-sm w-full shadow-xl shadow-slate-200/60 border border-white/70 bg-white/90">
        <CardContent className="space-y-3 p-6">
          <h2 className="text-lg font-semibold">Willkommen 👋</h2>
          <Input placeholder="Benutzername" onChange={(e) => setU({ ...u, username: e.target.value })} />
          <Input type="password" placeholder="Passwort" onChange={(e) => setU({ ...u, password: e.target.value })} />
          <Button className="w-full" onClick={() => {
            const found = users.find((x) => x.username === u.username && x.password === u.password);
            if (found) onLogin(found);
          }}>Login</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, subtitle, children, back }) {
  return (
    <Card className="shadow-lg shadow-slate-200/60 border border-white/70 bg-white/90">
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
        <Button variant="outline" onClick={back}>Zurück</Button>
      </CardContent>
    </Card>
  );
}

function Tile({ title, onClick, active }) {
  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 ${
        active
          ? "bg-slate-900 text-white shadow-lg shadow-slate-400/40 scale-[1.01]"
          : "bg-white/80 hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      <CardContent className="text-center font-semibold py-3">{title}</CardContent>
    </Card>
  );
}

function StatCard({ label, value }) {
  return (
    <Card className="bg-white/90 border border-white/80">
      <CardContent className="space-y-1">
        <div className="text-xs uppercase text-slate-500 tracking-wide">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function CustomerForm({ onAdd }) {
  const [c, setC] = useState({});
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input placeholder="Vorname" onChange={(e) => setC({ ...c, firstname: e.target.value })} />
      <Input placeholder="Nachname" onChange={(e) => setC({ ...c, lastname: e.target.value })} />
      <Input placeholder="Straße" onChange={(e) => setC({ ...c, street: e.target.value })} />
      <Input placeholder="Hausnummer" onChange={(e) => setC({ ...c, houseNumber: e.target.value })} />
      <Input placeholder="PLZ" onChange={(e) => setC({ ...c, zip: e.target.value })} />
      <Input placeholder="Ort" onChange={(e) => setC({ ...c, city: e.target.value })} />
      <Input placeholder="Telefon" onChange={(e) => setC({ ...c, phone: e.target.value })} />
      <Input placeholder="E-Mail" onChange={(e) => setC({ ...c, email: e.target.value })} />
      <Input placeholder="Kennzeichen" onChange={(e) => setC({ ...c, plate: e.target.value })} />
      <Textarea className="col-span-2" placeholder="Kommentar" onChange={(e) => setC({ ...c, comment: e.target.value })} />
      <Button className="col-span-2" onClick={() => onAdd(c)}>Kunde hinzufügen</Button>
    </div>
  );
}

function OrderForm({ customers, services, onAdd }) {
  const [o, setO] = useState({ priority: "Normal" });
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <Input placeholder="Auftragstitel" onChange={(e) => setO({ ...o, title: e.target.value })} />
      <Input type="date" onChange={(e) => setO({ ...o, date: e.target.value })} />
      <select className="border rounded px-2 py-2" onChange={(e) => setO({ ...o, customer: e.target.value })}>
        <option>Kunde auswählen</option>
        {customers.map((c) => (
          <option key={c.id}>{c.firstname} {c.lastname}</option>
        ))}
      </select>
      <select className="border rounded px-2 py-2" onChange={(e) => setO({ ...o, service: e.target.value })}>
        <option>Leistung auswählen</option>
        {services.map((s, i) => (
          <option key={i}>{s.name}</option>
        ))}
      </select>
      <select className="border rounded px-2 py-2" onChange={(e) => setO({ ...o, priority: e.target.value })}>
        <option>Normal</option>
        <option>Hoch</option>
        <option>Gering</option>
      </select>
      <div className="md:col-span-2">
        <Button onClick={() => onAdd(o)}>Auftrag hinzufügen</Button>
      </div>
    </div>
  );
}

function InvoiceDialog({ order, hourlyRate, taxNotice, onCreate }) {
  const [hours, setHours] = useState(1);
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader><DialogTitle>Rechnung erstellen</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="text-slate-600">{order.title} · {order.customer}</div>
          <Input type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          <div>Gesamtbetrag: {formatCurrency(hours * hourlyRate)}</div>
          <div className="text-xs text-slate-500">{taxNotice}</div>
        </div>
        <Button onClick={() => onCreate(order, hours)}>Rechnung speichern</Button>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ invoice, onClose, onSave }) {
  const [payload, setPayload] = useState({
    amount: invoice.total,
    date: new Date().toISOString().slice(0, 10),
    method: "Überweisung"
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Zahlung erfassen</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div className="text-sm text-slate-600">{invoice.invoiceNumber} · {invoice.customer}</div>
          <Input type="number" value={payload.amount} onChange={(e) => setPayload({ ...payload, amount: Number(e.target.value) })} />
          <Input type="date" value={payload.date} onChange={(e) => setPayload({ ...payload, date: e.target.value })} />
          <Input placeholder="Zahlungsart" value={payload.method} onChange={(e) => setPayload({ ...payload, method: e.target.value })} />
          <Button onClick={() => onSave(invoice, payload)}>Zahlung speichern</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function priorityColor(p) {
  if (p === "Hoch") return "bg-rose-50 border border-rose-200";
  if (p === "Gering") return "bg-emerald-50 border border-emerald-200";
  return "bg-slate-50 border border-slate-200";
}

function statusColor(s) {
  if (s === "Erledigt") return "text-green-600";
  if (s === "In Arbeit") return "text-blue-600";
  if (s === "Offen") return "text-amber-600";
  return "text-slate-600"; // korrekt beendet, kein ungültiges Zeichen
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("de-DE");
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
