# 🚀 Deploy to Render - FREE FastAPI Hosting

## ✅ Render Free Tier (2025):
- **FREE forever** for web services
- 512MB RAM, shared CPU
- Automatic SSL certificates
- Custom domains supported
- No credit card needed!

---

## 📋 Step-by-Step Deployment:

### 1. Create GitHub Repository
Since your local repo isn't on GitHub yet:

1. Go to [github.com](https://github.com) and log in
2. Click "New" repository
3. Name it: `TrashCollectionProject`
4. Make it **Public** (required for Render free tier)
5. **Don't** initialize with README (we have our code)
6. Click "Create repository"

### 2. Push Your Code to GitHub
Run these commands in your terminal:

```bash
# Add the correct GitHub repository URL
git remote set-url origin https://github.com/YOUR_USERNAME/TrashCollectionProject.git

# Push your code (it will ask for GitHub username/password)
git push -u origin main
```

### 3. Deploy on Render

1. **Go to [render.com](https://render.com)**
2. **Sign up/Login** (use GitHub login for easiest setup)
3. **Click "New +"** → **"Web Service"**
4. **Connect your GitHub repo**: `TrashCollectionProject`
5. **Configure the service**:
   - **Name**: `trash-collection-app`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`

6. **Click "Create Web Service"**

### 4. Wait for Deployment
- Build time: ~3-5 minutes
- Render will automatically detect your Python app
- Watch the build logs for any issues

### 5. Your App is Live! 🎉
Your app will be available at: `https://trash-collection-app.onrender.com`

---

## 🔧 Configuration Files Added:
- ✅ `render.yaml` - Render service configuration
- ✅ `Dockerfile` - Updated for production
- ✅ `requirements.txt` - All Python dependencies

## 🎯 What Works on Render:
- ✅ File uploads (images)
- ✅ SQLite database (persistent storage)
- ✅ Interactive map with Leaflet
- ✅ GPS coordinate extraction
- ✅ All your API endpoints
- ✅ Static files (CSS, JS, images)

## 🚨 Important Notes:
- **Free tier**: App may sleep after 15 min of inactivity
- **Wake up time**: ~30 seconds when someone visits
- **Storage**: SQLite database persists between deployments
- **HTTPS**: Automatic SSL certificates

## 🔄 Future Updates:
To update your deployed app:
1. Make changes locally
2. `git add . && git commit -m "Update"`
3. `git push origin main`
4. Render automatically redeploys!

---

**Ready to deploy? Follow the steps above!** 🚀 