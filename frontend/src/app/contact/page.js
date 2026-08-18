'use client';

import { useState } from 'react';
import { useTenant } from '@/context/TenantContext';
import Reveal from '@/components/ui/Reveal';
import toast from 'react-hot-toast';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';

export default function ContactPage() {
  const { hotel } = useTenant() || {};
  const hotelName = hotel?.name || 'Grand Horizon';
  const email = hotel?.email || 'info@grandhorizon.com';
  const phone = hotel?.phone || '+91 98765 43210';
  const address = hotel?.address ? `${hotel.address}${hotel.city ? ', ' + hotel.city : ''}${hotel.state ? ', ' + hotel.state : ''}` : '42 MG Road, Bangalore, Karnataka';

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in your name, email and message.');
      return;
    }
    setSending(true);
    const subject = encodeURIComponent(form.subject || `Enquiry from ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    setTimeout(() => {
      setSending(false);
      toast.success('Opening your email app to send the message.');
    }, 400);
  };

  const cards = [
    { icon: MapPin, title: 'Visit Us', lines: [address] },
    { icon: Phone, title: 'Call Us', lines: [phone], href: `tel:${phone}` },
    { icon: Mail, title: 'Email Us', lines: [email], href: `mailto:${email}` },
    { icon: Clock, title: 'Reception', lines: ['Open 24 hours', `Check-in ${hotel?.checkInTime || '14:00'} · Check-out ${hotel?.checkOutTime || '11:00'}`] },
  ];

  return (
    <main className="bg-white">
      {/* Header */}
      <section className="relative h-[38vh] min-h-[300px] flex items-center justify-center overflow-hidden">
        <img src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1600&q=85" alt="Contact" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60" />
        <Reveal className="relative text-center text-white px-5">
          <span className="text-primary-300 text-xs font-semibold uppercase tracking-widest">We'd love to hear from you</span>
          <h1 className="font-display text-4xl md:text-6xl font-semibold mt-3">Contact Us</h1>
        </Reveal>
      </section>

      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-24">
        {/* Info cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {cards.map((c, i) => {
            const CardBody = (
              <>
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mb-4">
                  <c.icon className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-display font-semibold text-gray-900 text-lg mb-1.5">{c.title}</h3>
                {c.lines.map((l) => (
                  <p key={l} className="text-gray-500 text-sm leading-relaxed">{l}</p>
                ))}
              </>
            );
            return (
              <Reveal key={c.title} delay={i * 80}>
                {c.href ? (
                  <a href={c.href} className="p-6 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all bg-white block h-full">{CardBody}</a>
                ) : (
                  <div className="p-6 rounded-2xl border border-gray-100 bg-white h-full">{CardBody}</div>
                )}
              </Reveal>
            );
          })}
        </div>

        {/* Form + Map */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <Reveal>
            <span className="eyebrow mb-4">Send a Message</span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-gray-900 mt-4 mb-4">Get in touch with {hotelName}</h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Have a question about your stay, a special request, or a group booking? Fill in the form and our team will get back to you shortly.
            </p>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Your Name</label>
                  <input className="input" value={form.name} onChange={update('name')} placeholder="John Doe" />
                </div>
                <div>
                  <label className="label">Your Email</label>
                  <input type="email" className="input" value={form.email} onChange={update('email')} placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="label">Subject</label>
                <input className="input" value={form.subject} onChange={update('subject')} placeholder="How can we help?" />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea className="input h-32 resize-none" value={form.message} onChange={update('message')} placeholder="Write your message…" />
              </div>
              <button type="submit" disabled={sending} className="btn-primary w-full sm:w-auto">
                {sending ? 'Sending…' : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" /> Send Message
                  </span>
                )}
              </button>
            </form>
          </Reveal>

          {/* Map */}
          <Reveal delay={120} className="rounded-2xl overflow-hidden shadow-md border border-gray-100 h-[500px]">
            <iframe
              title="Location map"
              className="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
            />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
