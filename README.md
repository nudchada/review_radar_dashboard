# 🎯 Review Radar Dashboard

A comprehensive web-based dashboard for analyzing and visualizing customer review data with sentiment analysis, trend tracking, and actionable insights.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the Application](#-running-the-application)
- [Project Structure](#-project-structure)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- **Interactive Dashboard**: Real-time visualization of review metrics and trends
- **Sentiment Analysis**: Automated sentiment classification of customer reviews
- **Data Cleaning Pipeline**: Robust text preprocessing and validation
- **Batch Processing**: Efficient handling of large review datasets
- **Multi-source Support**: Aggregate reviews from various platforms
- **Responsive Design**: Mobile-friendly interface with modern UI/UX

## 🛠 Tech Stack

- **Backend**: Python, Flask
- **Frontend**: HTML, CSS, JavaScript
- **Database**: Supabase (PostgreSQL)
- **Data Processing**: Pandas, NumPy
- **Text Processing**: Emoji, Regular Expressions
- **Visualization**: Chart.js / Plotly (assumed based on dashboard nature)

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- Python 3.8 or higher
- pip (Python package manager)
- Git
- A Supabase account and project (for database)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/nudchada/review_radar_dashboard.git
cd review_radar_dashboard
```

### 2. Create a Virtual Environment

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
touch .env
```

Add the following configuration (replace with your actual credentials):

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Flask Configuration
FLASK_APP=app
FLASK_ENV=development
SECRET_KEY=your_secret_key_here

# Optional: Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=review_radar
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

### 5. Initialize the Database

Set up your Supabase database with the required tables:

```sql
-- Example schema for raw_data table
CREATE TABLE raw_data (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    review_date DATE NOT NULL,
    review TEXT NOT NULL,
    review_cleaned TEXT,
    sentiment VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_batch_id ON raw_data(batch_id);
CREATE INDEX idx_source ON raw_data(source);
CREATE INDEX idx_review_date ON raw_data(review_date);
```

## 🎮 Running the Application

### Development Mode

```bash
# Make sure your virtual environment is activated
python app/main.py
```

Or using Flask CLI:

```bash
flask run
```

The application will be available at `http://localhost:5000`

### Production Mode

For production deployment, use a WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app
```

## 📁 Project Structure

```
review_radar_dashboard/
│
├── app/                      # Main application package
│   ├── __init__.py
│   ├── main.py              # Flask application entry point
│   ├── routes.py            # API routes and endpoints
│   ├── models.py            # Database models
│   └── utils.py             # Utility functions
│
├── templates/               # HTML templates
│   ├── index.html           # Main dashboard page
│   ├── analytics.html       # Analytics page
│   └── base.html            # Base template
│
├── static/                  # Static files
│   ├── css/                 # Stylesheets
│   ├── js/                  # JavaScript files
│   └── images/              # Images and icons
│
├── mock_data/               # Sample data for testing
│   └── sample_reviews.csv   # Mock review data
│
├── requirements.txt         # Python dependencies
├── .gitignore              # Git ignore file
├── .env                    # Environment variables (not in repo)
└── README.md               # This file
```

## 💡 Usage

### Data Processing Workflow

1. **Upload Reviews**: Import review data via CSV or API integration
2. **Automatic Cleaning**: Reviews are processed through the cleaning pipeline
3. **Sentiment Analysis**: AI-powered sentiment classification
4. **Visualization**: View insights on the interactive dashboard

### Batch Processing Example

```python
from app.utils import process_batch_cleaning

# Process reviews in batches of 100
process_batch_cleaning(batch_size=100)
```

### Text Cleaning Features

The cleaning pipeline includes:
- Emoji removal
- Character repetition normalization (e.g., "สวยยยยย" → "สวยยย")
- Whitespace normalization
- Text validation (ensures content has actual letters)
- Custom word replacement (e.g., "ตี้น้อย" → "42")

## ⚙️ Configuration

### Cleaning Parameters

Modify `app/utils.py` to customize text cleaning:

```python
def clean_and_validate_review(text):
    # Customize max character repetitions
    text = re.sub(r'(.)\1{2,}', r'\1\1', text)  # Change from 3 to 2
    
    # Add custom replacements
    text = re.sub(r'your_pattern', 'replacement', text)
    
    return text
```

### Dashboard Settings

Adjust dashboard parameters in `app/main.py`:

```python
# Pagination
REVIEWS_PER_PAGE = 50

# Batch size for processing
DEFAULT_BATCH_SIZE = 100

# Refresh interval (in seconds)
DASHBOARD_REFRESH = 300
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **nudchada** - *Initial work* - [GitHub](https://github.com/nudchada)

## 🙏 Acknowledgments

- Supabase for database infrastructure
- Flask community for excellent documentation
- All contributors who have helped improve this project

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

**Note**: This is a data analysis tool. Please ensure compliance with data privacy regulations (GDPR, PDPA, etc.) when processing customer reviews.
