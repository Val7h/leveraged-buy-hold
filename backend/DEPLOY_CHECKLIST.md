# Content Moderation System - Deployment Checklist

## Pre-Deployment Verification

### Code Files
- [x] app/models/moderation.py
- [x] app/schemas/moderation.py
- [x] app/services/content_moderation.py
- [x] app/api/v1/moderation.py
- [x] app/api/v1/moderation_admin_dashboard.py
- [x] app/main.py (updated)
- [x] tests/test_moderation.py
- [x] migrations/001_add_moderation_tables.sql
- [x] migrations/002_add_role_to_users.sql

### Documentation
- [x] CONTENT_MODERATION_SYSTEM.md
- [x] MODERATION_INTEGRATION_GUIDE.md
- [x] MODERATION_QUICK_REFERENCE.md
- [x] API_ENDPOINTS_REFERENCE.md
- [x] IMPLEMENTATION_SUMMARY.md
- [x] DEPLOY_CHECKLIST.md

## Setup Checklist

### 1. Database Setup
- [ ] MySQL/MariaDB running
- [ ] Database created and accessible
- [ ] User has CREATE TABLE permissions
- [ ] Run migration: `001_add_moderation_tables.sql`
- [ ] Verify tables created:
  ```sql
  SELECT COUNT(*) FROM content_reports;
  SELECT COUNT(*) FROM content_moderation_logs;
  ```

### 2. Configuration
- [ ] Update `admin_emails` in `app/api/v1/moderation.py`
- [ ] Add PT-BR banned words to `BANNED_WORDS` in `app/services/content_moderation.py`
- [ ] Set environment variables (optional):
  - ADMIN_EMAILS
  - DATABASE_URL
- [ ] Verify `settings.py` has database connection

### 3. Dependencies
- [ ] All imports work (test with `python -c "from app.models.moderation import *"`)
- [ ] SQLAlchemy installed
- [ ] Pydantic installed
- [ ] FastAPI installed
- [ ] Python 3.8+

### 4. Testing
- [ ] Run unit tests: `pytest tests/test_moderation.py -v`
- [ ] All tests pass: 50+ test cases
- [ ] Test with clean database
- [ ] Test with existing data

### 5. Integration
- [ ] Updated `app/main.py` includes moderation routers
- [ ] No import errors on startup
- [ ] App starts without errors: `uvicorn app.main:app --reload`

### 6. API Verification
- [ ] Health check works: `GET /api/health`
- [ ] Swagger docs available: `GET /api/docs`
- [ ] Try check endpoint: `GET /api/v1/content/check?text=test`
- [ ] Try report endpoint: `POST /api/v1/content/report`
- [ ] Admin can access dashboard: `/api/v1/admin/moderation/dashboard`

### 7. Dashboard Testing
- [ ] Dashboard loads (HTML renders)
- [ ] Statistics display
- [ ] Can filter reports
- [ ] Can search by message ID
- [ ] Action buttons work
- [ ] Modal dialog appears
- [ ] Actions are processed
- [ ] Confirmation works

### 8. Authentication
- [ ] User can login
- [ ] JWT token generated
- [ ] Public endpoints require token
- [ ] Admin endpoints check role
- [ ] Non-admin users get 403

### 9. Database Queries
- [ ] Reports created with correct status
- [ ] Logs created on actions
- [ ] Timestamps set correctly
- [ ] Foreign keys work
- [ ] Indexes present

### 10. Error Handling
- [ ] Invalid input rejected with 400
- [ ] Missing auth returns 401
- [ ] Non-admin gets 403
- [ ] Not found returns 404
- [ ] Invalid data returns 422

## Pre-Production

### Security
- [ ] No hardcoded secrets in code
- [ ] No passwords in logs
- [ ] HTTPS enabled in production
- [ ] CORS configured correctly
- [ ] Rate limiting ready (see docs)

### Performance
- [ ] Database indexes verified:
  ```sql
  SHOW INDEX FROM content_reports;
  SHOW INDEX FROM content_moderation_logs;
  ```
- [ ] Pagination working
- [ ] Slow queries monitored
- [ ] Connection pooling configured

### Monitoring
- [ ] Logging configured
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Metrics exported (Prometheus, etc.)
- [ ] Dashboard refresh rate optimal
- [ ] Database backups scheduled

### Documentation
- [ ] Team trained on dashboard
- [ ] Integration guide reviewed
- [ ] API reference available
- [ ] Troubleshooting guide available
- [ ] Escalation procedures defined

## Deployment Steps

### 1. Pre-deployment
```bash
# Test everything locally
pytest tests/test_moderation.py -v --cov

# Check code quality
flake8 app/
black --check app/
```

### 2. Backup
```bash
# Backup existing database
mysqldump -u user -p database > backup_$(date +%s).sql

# Verify backup
mysql -u user -p database < backup_$(date +%s).sql
```

### 3. Migrate
```bash
# Run migration (on production database)
mysql -u user -p database < migrations/001_add_moderation_tables.sql

# Verify tables exist
mysql -u user -p database -e "SHOW TABLES LIKE 'content_%';"
```

### 4. Deploy Code
```bash
# Pull latest code
git pull origin main

# Install dependencies
pip install -r requirements.txt

# Start app with gunicorn (production)
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app
```

### 5. Post-deployment
```bash
# Verify app running
curl https://yourdomain.com/api/health

# Check database connection
curl -H "Authorization: Bearer TOKEN" \
  https://yourdomain.com/api/v1/content/admin/statistics

# Monitor logs
tail -f /var/log/app.log
```

## Rollback Plan

If deployment fails:

```bash
# 1. Rollback code
git revert <commit>
git push origin main

# 2. Restart app
# (depends on your deployment method)

# 3. Rollback database (if needed)
mysql -u user -p database < backup_*.sql

# 4. Notify team
# Send message about incident
```

## Post-Deployment Tasks

- [ ] Monitor error logs for 24 hours
- [ ] Check database performance
- [ ] Verify admin can use dashboard
- [ ] Test with real reports
- [ ] Train support team
- [ ] Create runbook for operations
- [ ] Document any customizations

## Monitoring Queries

### Check active reports
```sql
SELECT status, COUNT(*) FROM content_reports GROUP BY status;
```

### Recent actions
```sql
SELECT * FROM content_moderation_logs ORDER BY created_at DESC LIMIT 10;
```

### Reports per user
```sql
SELECT reporter_id, COUNT(*) FROM content_reports GROUP BY reporter_id;
```

### Moderator actions
```sql
SELECT moderator_id, action, COUNT(*) 
FROM content_moderation_logs 
GROUP BY moderator_id, action;
```

## Troubleshooting Deployment

### Database migration fails
- Check MySQL user permissions
- Verify database exists
- Check for existing tables
- Review error logs

### App won't start
- Check imports: `python -c "from app.models.moderation import *"`
- Check syntax: `python -m py_compile app/api/v1/moderation.py`
- Review logs for errors

### Dashboard not loading
- Check browser console for errors
- Verify JWT token in localStorage
- Check if user is admin
- Check network requests (F12)

### API returns 404
- Verify routes registered in main.py
- Check FastAPI docs at /api/docs
- Verify endpoint paths
- Check authentication

## Success Criteria

Deployment is successful when:

- ✅ All tests pass (pytest)
- ✅ App starts without errors
- ✅ Dashboard loads and works
- ✅ Can create and process reports
- ✅ Admin actions create logs
- ✅ Statistics display correctly
- ✅ No error logs in first 24h
- ✅ Database queries respond <200ms
- ✅ Team trained and confident

## Sign-off

- [ ] Backend Lead: _________________ Date: _________
- [ ] QA Lead: _________________ Date: _________
- [ ] DevOps Lead: _________________ Date: _________
- [ ] Product Manager: _________________ Date: _________

## Post-Launch Support

### First Week
- Monitor dashboard daily
- Check logs for errors
- Verify all features working
- Gather team feedback

### First Month
- Review moderation metrics
- Optimize banned words list
- Train additional moderators
- Document edge cases

### Ongoing
- Monthly statistics review
- Update documentation
- Add new features (appeals, etc.)
- Improve detection algorithms

---

**Status:** Ready for Deployment ✅
**Last Updated:** 2024-06-05
**Version:** 1.0.0
