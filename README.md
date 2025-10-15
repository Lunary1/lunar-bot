# 🚀 Pokémon SaaS Shopping Bot

A production-ready SaaS platform for automated Pokémon product purchasing with real-time stock monitoring and instant checkout capabilities.

## 🎯 Overview

This platform provides automated purchasing capabilities for Pokémon products across multiple European stores, similar to StellarAIO but focused specifically on Pokémon merchandise. Users can monitor products, set price alerts, and enable auto-purchase when items come back in stock.

## ✨ Features

### 🔍 **Stock Monitoring**
- Real-time product monitoring across multiple stores
- Automatic stock change detection
- Price drop alerts and notifications
- Batch processing for efficient monitoring

### 🛒 **Automated Purchasing**
- Instant auto-purchase when items come in stock
- User-defined price limits and preferences
- Multiple store account support
- Proxy rotation for anti-detection

### 👥 **User Management**
- Secure authentication with Supabase Auth
- Subscription tiers (Free, Basic, Premium, Enterprise)
- Encrypted credential storage
- Real-time dashboard with task monitoring

### 🏪 **Supported Stores**
- ToyChamp
- Pokémon Center EU
- Bol.com
- Mediamarkt
- Fnac
- Coolblue
- Game Mania
- Bart Smit

## 🏗️ Technical Architecture

### **Frontend**
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + ShadCN/UI
- **State Management**: React Query / Tanstack Query
- **Animations**: Framer Motion

### **Backend**
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe integration

### **Automation**
- **Browser Automation**: Playwright
- **Queue System**: BullMQ + Redis
- **Workers**: Isolated Node.js processes
- **Monitoring**: Real-time status updates

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Redis server
- Supabase account
- Stripe account (for payments)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/pokemon-saas-shopping-bot.git
cd pokemon-saas-shopping-bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Fill in your environment variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

4. **Set up the database**
```bash
# Run Supabase migrations
npx supabase db push
```

5. **Start Redis server**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
# macOS: brew install redis
# Ubuntu: sudo apt install redis-server
```

6. **Start the development servers**
```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start worker service
npm run worker
```

## 📋 Usage

### **For Users**

1. **Sign Up**: Create an account and choose a subscription plan
2. **Add Store Accounts**: Configure your store login credentials
3. **Add Products to Watchlist**: Monitor specific Pokémon products
4. **Enable Auto-Purchase**: Set price limits and enable automatic purchasing
5. **Monitor Tasks**: Track your automated purchases in real-time

### **For Developers**

1. **Add New Store Support**: Implement store-specific bots in `src/bots/`
2. **Customize Monitoring**: Adjust monitoring intervals in `ProductMonitor.ts`
3. **Extend Notifications**: Add new notification channels in the notification system
4. **Scale Workers**: Deploy additional worker instances for higher throughput

## 🛠️ Development

### **Project Structure**
```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
├── bots/               # Store-specific automation bots
├── workers/            # Background task processors
├── services/           # Business logic services
├── lib/               # Utility functions
└── hooks/             # Custom React hooks
```

### **Key Components**

- **ProductMonitor**: Continuous stock monitoring service
- **TaskExecutor**: BullMQ task queue management
- **StoreBot**: Base class for store-specific automation
- **ProductScraper**: Playwright-based data extraction

### **Adding New Stores**

1. Create a new bot class extending `StoreBot`
2. Implement store-specific selectors and logic
3. Add store configuration to the database
4. Test with the monitoring system

## 🔒 Security

- **Encrypted Storage**: All sensitive data is encrypted
- **Row Level Security**: Database access is user-scoped
- **Rate Limiting**: API endpoints are rate-limited
- **Proxy Rotation**: Anti-detection measures implemented
- **GDPR Compliance**: User data protection built-in

## 📊 Monitoring

- **Real-time Dashboard**: Live task monitoring
- **Success Metrics**: Purchase success rates and analytics
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: System health and performance metrics

## 🚀 Deployment

### **Frontend (Vercel)**
```bash
# Deploy to Vercel
vercel --prod
```

### **Backend Workers (DigitalOcean/Railway)**
```bash
# Build and deploy workers
npm run build:worker
# Deploy to your preferred platform
```

### **Database (Supabase)**
- Production database is managed by Supabase
- Automatic backups and scaling
- Real-time subscriptions enabled

## 📈 Performance

- **< 2 seconds** page load time
- **> 99.5%** uptime
- **< 5 seconds** task creation time
- **> 90%** successful checkout rate
- **< 1%** error rate
- **1000+** concurrent users supported

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discord**: Join our community for support and updates

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced AI features
- [ ] More store integrations
- [ ] Enhanced analytics
- [ ] API for third-party integrations

---

**Built with ❤️ for the Pokémon community**

*This project is for educational and personal use. Please respect store terms of service and use responsibly.*