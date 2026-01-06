import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/*
STAND: stabilste & weiteste Version
➡️ NUR ERGÄNZT, nichts entfernt
*/

export default function App() {
  const exportInvoicePDF = (invoice) => {
    const content = `Rechnung\n\nAuftragsnummer: ${invoice.orderNumber}\nKunde: ${invoice.customer}\nArbeitszeit: ${invoice.hours} Std.\nGesamt: ${invoice.total} €`;
    const win = window.open('', '', 'width=600,height=400');
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
    hourlyRate: 60,
    services: [
      { name: "Innenreinigung", price: 80 },
      { name: "Außenaufbereitung", price: 120 },
      { name: "Komplettpaket", price: 180 }
    ]
  });

  /* HILFSFUNKTION */
  const log = (action) => {
    if (!user) return;
    setAuditLog((l) => [
      ...l,
      { time: new Date().toLocaleString(), user: user.username, action }
    ]);
  };

  const generateOrderNumber = () => Math.floor(100000 + Math.random() * 900000);

  /* CRUD */
  const addCustomer = (c) => {
    setCustomers([...customers, { ...c, id: Date.now() }]);
    log(`Kunde angelegt: ${c.firstname} ${c.lastname}`);
  };

  const addOrder = (o) => {
    const orderNumber = generateOrderNumber();
    setOrders([
      ...orders,
      { ...o, id: Date.now(), orderNumber, status: "Offen" }
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
    setInvoices([
      ...invoices,
      {
        id: Date.now(),
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        hours,
        total
      }
    ]);
    log(`Rechnung erstellt für Auftrag: ${order.title}`);
    setInvoiceDialog(null);
  };

  /* LOGIN */
  if (!user) return <Login users={USERS} onLogin={setUser} />;

  return (
    <div className="p-6 space-y-6">
      {view === "dashboard" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Tile title="Terminkalender" onClick={() => setView("calendar")} />
          <Tile title="Kunden" onClick={() => setView("customers")} />
          <Tile title="Aufträge" onClick={() => setView("orders")} />
          <Tile title="Rechnungen" onClick={() => setView("invoices")} />
          <Tile title="Einstellungen" onClick={() => setView("settings")} />
          <Tile title="Protokoll" onClick={() => setView("audit")} />
        </div>
      )}

      {view === "customers" && (
        <Section title="Kundendaten" back={() => setView("dashboard")}>
          <CustomerForm onAdd={addCustomer} />
          <Input placeholder="Suche Kunde" value={searchCustomer} onChange={(e) => setSearchCustomer(e.target.value)} />
          {customers
            .filter((c) =>
              `${c.firstname} ${c.lastname}`
                .toLowerCase()
                .includes(searchCustomer.toLowerCase())
            )
            .map((c) => (
              <Card key={c.id} className="p-3 cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                <div className="font-semibold">{c.firstname} {c.lastname}</div>
                <div className="text-sm text-gray-500">{c.city}</div>
              </Card>
            ))}
        </Section>
      )}

      {view === "orders" && (
        <Section title="Aufträge" back={() => setView("dashboard")}>
          <OrderForm customers={customers} services={settings.services} onAdd={addOrder} />
          <Input placeholder="Auftragsnummer suchen" value={searchOrder} onChange={(e) => setSearchOrder(e.target.value)} />
          {orders
            .filter((o) => String(o.orderNumber).includes(searchOrder))
            .map((o) => (
              <Card key={o.id} className={`p-3 cursor-pointer ${priorityColor(o.priority)}`} onClick={() => setSelectedOrder(o)}>
                <div className="font-semibold">{o.orderNumber} – {o.title}</div>
                <div className={statusColor(o.status)}>Status: {o.status}</div>
              </Card>
            ))}
        </Section>
      )}

      {view === "calendar" && (
        <Section title="Terminkalender" back={() => setView("dashboard")}>
          {orders.filter((o) => o.date).map((o) => (
            <div key={o.id}>{o.date} – {o.orderNumber}</div>
          ))}
        </Section>
      )}

      {view === "invoices" && (
        <Section title="Rechnungen" back={() => setView("dashboard")}>
          <Input placeholder="Rechnung suchen (Auftragsnr.)" value={searchInvoice} onChange={(e) => setSearchInvoice(e.target.value)} />
          {invoices
            .filter((i) => String(i.orderNumber).includes(searchInvoice))
            .map((i) => (
              <Card key={i.id} className="p-2 cursor-pointer" onClick={() => setSelectedInvoice(i)}>
                {i.orderNumber} – {i.total} €
              </Card>
            ))}
        </Section>
      )}

      {view === "settings" && (
        <Section title="Einstellungen" back={() => setView("dashboard")}>
          <Input placeholder="Firmenname" value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
          <Input placeholder="Straße" value={settings.street} onChange={(e) => setSettings({ ...settings, street: e.target.value })} />
          <Input placeholder="PLZ" value={settings.zip} onChange={(e) => setSettings({ ...settings, zip: e.target.value })} />
          <Input placeholder="Ort" value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} />
          <Input placeholder="Telefon" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
          <Input placeholder="E-Mail" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
          <Input type="number" placeholder="Stundenlohn" value={settings.hourlyRate} onChange={(e) => setSettings({ ...settings, hourlyRate: Number(e.target.value) })} />

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
          <Button onClick={() => setSettings({ ...settings, services: [...settings.services, { name: "", price: 0 }] })}>Leistung hinzufügen</Button>
        </Section>
      )}

      {view === "audit" && (
        <Section title="Änderungsprotokoll" back={() => setView("dashboard")}>
          {auditLog.map((a, i) => (
            <div key={i} className="text-sm">[{a.time}] {a.user}: {a.action}</div>
          ))}
        </Section>
      )}

      {selectedCustomer && (
        <Dialog open onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Kundendetails</DialogTitle></DialogHeader>
            <div>{selectedCustomer.firstname} {selectedCustomer.lastname}</div>
            <div>{selectedCustomer.street} {selectedCustomer.houseNumber}</div>
            <div>{selectedCustomer.zip} {selectedCustomer.city}</div>
            <div>{selectedCustomer.phone}</div>
            <div>{selectedCustomer.email}</div>
            <div>Kennzeichen: {selectedCustomer.plate}</div>
            <div>Kommentar: {selectedCustomer.comment}</div>
            <h4 className="font-semibold mt-2">Rechnungen</h4>
            {invoices.filter(i => i.customer === `${selectedCustomer.firstname} ${selectedCustomer.lastname}`).map(i => (
              <div key={i.id} className="text-sm cursor-pointer underline" onClick={() => setSelectedInvoice(i)}>
                Rechnung {i.orderNumber} – {i.total} €
              </div>
            ))}
          </DialogContent>
        </Dialog>
      )}

      {selectedOrder && (
        <Dialog open onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Auftrag</DialogTitle></DialogHeader>
            <div>{selectedOrder.orderNumber}</div>
            <div>{selectedOrder.title}</div>
            <div>Status: {selectedOrder.status}</div>
            {selectedOrder.status !== "Erledigt" && (
              <Button onClick={() => { markOrderDone(selectedOrder); setSelectedOrder(null); }}>Als erledigt markieren</Button>
            )}
          </DialogContent>
        </Dialog>
      )}

      {invoiceDialog && (
        <InvoiceDialog order={invoiceDialog} hourlyRate={settings.hourlyRate} onCreate={createInvoice} />
      )}

      {selectedInvoice && (
        <Dialog open onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rechnung</DialogTitle></DialogHeader>
            <div>Auftragsnummer: {selectedInvoice.orderNumber}</div>
            <div>Kunde: {selectedInvoice.customer}</div>
            <div>Arbeitszeit: {selectedInvoice.hours} Std.</div>
            <div>Gesamt: {selectedInvoice.total} €</div>
            <Button onClick={() => exportInvoicePDF(selectedInvoice)}>Als PDF exportieren</Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* KOMPONENTEN */

function Login({ users, onLogin }) {
  const [u, setU] = useState({});
  return (
    <div className="p-10 max-w-sm mx-auto space-y-3">
      <Input placeholder="Benutzername" onChange={(e) => setU({ ...u, username: e.target.value })} />
      <Input type="password" placeholder="Passwort" onChange={(e) => setU({ ...u, password: e.target.value })} />
      <Button onClick={() => {
        const found = users.find((x) => x.username === u.username && x.password === u.password);
        if (found) onLogin(found);
      }}>Login</Button>
    </div>
  );
}

function Section({ title, children, back }) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="text-xl font-bold">{title}</h2>
        {children}
        <Button onClick={back}>Zurück</Button>
      </CardContent>
    </Card>
  );
}

function Tile({ title, onClick }) {
  return (
    <Card onClick={onClick} className="cursor-pointer">
      <CardContent className="text-center font-bold">{title}</CardContent>
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
      <Textarea placeholder="Kommentar" onChange={(e) => setC({ ...c, comment: e.target.value })} />
      <Button className="col-span-2" onClick={() => onAdd(c)}>Kunde hinzufügen</Button>
    </div>
  );
}

function OrderForm({ customers, services, onAdd }) {
  const [o, setO] = useState({ priority: "Normal" });
  return (
    <div className="space-y-2">
      <Input placeholder="Auftragstitel" onChange={(e) => setO({ ...o, title: e.target.value })} />
      <select onChange={(e) => setO({ ...o, customer: e.target.value })}>
        <option>Kunde auswählen</option>
        {customers.map((c) => (
          <option key={c.id}>{c.firstname} {c.lastname}</option>
        ))}
      </select>
      <select onChange={(e) => setO({ ...o, service: e.target.value })}>
        <option>Leistung auswählen</option>
        {services.map((s, i) => (
          <option key={i}>{s.name}</option>
        ))}
      </select>
      <select onChange={(e) => setO({ ...o, priority: e.target.value })}>
        <option>Normal</option>
        <option>Hoch</option>
        <option>Gering</option>
      </select>
      <Input type="date" onChange={(e) => setO({ ...o, date: e.target.value })} />
      <Button onClick={() => onAdd(o)}>Auftrag hinzufügen</Button>
    </div>
  );
}

function InvoiceDialog({ order, hourlyRate, onCreate }) {
  const [hours, setHours] = useState(1);
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader><DialogTitle>Rechnung erstellen</DialogTitle></DialogHeader>
        <Input type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
        <div>Gesamtbetrag: {hours * hourlyRate} €</div>
        <Button onClick={() => onCreate(order, hours)}>Rechnung speichern</Button>
      </DialogContent>
    </Dialog>
  );
}

function priorityColor(p) {
  if (p === "Hoch") return "bg-red-200";
  if (p === "Gering") return "bg-green-200";
  return "bg-yellow-100";
}

function statusColor(s) {
  if (s === "Erledigt") return "text-green-600";
  if (s === "In Arbeit") return "text-yellow-600";
  return "text-red-600"; // korrekt beendet, kein ungültiges Zeichen
}
