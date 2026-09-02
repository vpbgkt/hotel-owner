'use client';

import { useState } from 'react';
import { useTenant } from '@/context/TenantContext';
import Reveal from '@/components/ui/Reveal';
import toast from 'react-hot-toast';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';

export default function ContactPage() {
  const { hotel } = useTenant() || {};
  const hotelName = hotel?.name || 'Radhika Resort';
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
            <div>
            {hotel?.phone && (
            <a
              href={`https://wa.me/${hotel.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, I would like to inquire about booking a room at ${hotel?.name || 'your hotel'}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium px-5 py-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
              </svg>
              <span>Chat on WhatsApp</span>
            </a>
            )}
            </div>
           <p className="eyebrow my-4 w-full !flex !justify-center">OR</p>
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
                    <Send className="w-4 h-4" /> Send Email
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
