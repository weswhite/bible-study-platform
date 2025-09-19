# Bible Study App - Project Summary

## Overview
A full-stack Bible study application designed to facilitate collaborative scripture study within small groups. Built with modern web technologies and deployed to Fly.io, this platform enables study groups to engage with biblical texts through structured studies, interactive discussions, and collaborative commentary.

## Core Features

### Study Group Management
- **Group Creation & Membership**: Users can create or join study groups with role-based permissions
- **Leader Controls**: Group leaders can manage membership, create studies, and moderate discussions
- **Member Participation**: Group members can participate in studies, answer questions, and contribute commentary

### Study System
- **Flexible Study Focus**: Studies can target specific books of the Bible or thematic topics
- **Weekly Structure**: Each study consists of weekly sessions with designated passages
- **Markdown-Based Content**: Study materials are stored as Markdown files for easy authoring and version control
- **Scheduling System**: Leaders can schedule studies and assign them to specific weeks

### Interactive Study Experience
- **Collaborative Commentary**: Users can add comments and insights to any part of the study content
- **Question & Answer System**: Structured Q&A sections for each study session
- **Real-time Collaboration**: Similar to Notion/Google Docs, users can see contributions from other group members
- **Passage-Focused Discussions**: Comments and discussions tied directly to specific Bible passages

### Content Management
- **Markdown Study Files**: All study content authored in Markdown for flexibility and version control
- **Media Integration**: Support for images, videos, and external links within study materials
- **Study Templates**: Reusable templates for common study formats
- **Resource Library**: Shared repository of study materials and resources

## Technical Architecture

### Frontend
- **React Router v7**: Latest version with Remix-style server-side rendering patterns
- **Loaders & Actions**: Server-side data fetching and mutations following Remix conventions
- **Modern UI**: Responsive design optimized for both desktop and mobile study sessions
- **Real-time Updates**: Live collaboration features for group interactions

### Backend
- **Node.js + TypeScript**: Express.js API server with full TypeScript support
- **Prisma ORM**: Type-safe database operations with PostgreSQL
- **Authentication**: JWT-based auth system with role-based access control
- **File Management**: Markdown file processing and version control integration

### Database Design
- **PostgreSQL**: Robust relational database supporting complex study group relationships
- **Prisma Schema**: Type-safe schema definitions with automated migrations
- **Scalable Design**: Optimized for multiple concurrent study groups and users

### Deployment & Infrastructure
- **Fly.io Hosting**: Scalable cloud deployment with global edge locations
- **CI/CD Pipeline**: GitHub Actions for automated testing and deployment
- **Environment Management**: Separate staging and production environments
- **Database Management**: Automated migrations and backup strategies

## User Roles & Permissions

### Group Leader
- Create and manage study groups
- Add/remove members from groups
- Create new studies and assign passages
- Schedule study sessions
- Moderate discussions and comments
- Upload and manage study materials

### Group Member
- Join assigned study groups
- Participate in study discussions
- Answer study questions
- Add comments and insights to passages
- View study schedules and assignments
- Access study materials and resources

### System Administrator
- Manage user accounts and permissions
- Monitor system performance and usage
- Manage global study templates and resources
- Handle technical support and maintenance

## Study Workflow

### Study Creation
1. Leader creates a new study focusing on a book or theme
2. Study is broken down into weekly sessions with specific passages
3. Questions and discussion prompts are added to each session
4. Study is scheduled and assigned to the group

### Weekly Study Process
1. Members access the week's assigned passage and materials
2. Members read and study the assigned scripture
3. Members answer structured questions and prompts
4. Members add comments and insights throughout the study
5. Group discusses findings and shares interpretations
6. Leader facilitates discussion and provides additional guidance

### Collaborative Features
- **Inline Comments**: Click anywhere in the study to add contextual comments
- **Question Responses**: Structured answers to study questions
- **Peer Review**: Members can respond to each other's insights
- **Progress Tracking**: Visual indicators of study completion and participation

## Development Priorities

### Phase 1: Core Platform
- User authentication and group management
- Basic study creation and viewing
- Markdown file processing and display
- Essential commenting system

### Phase 2: Enhanced Collaboration
- Real-time comment updates
- Advanced discussion threading
- Study scheduling and notifications
- Mobile-responsive design improvements

### Phase 3: Advanced Features
- Study analytics and progress tracking
- Advanced search and filtering
- Integration with Bible APIs for cross-references
- Export and sharing capabilities

### Phase 4: Community Features
- Public study repository
- Study sharing between groups
- Community-contributed content
- Advanced moderation tools

## Success Metrics
- **User Engagement**: Active participation in study discussions
- **Group Growth**: Number of active study groups and members
- **Content Creation**: Volume of user-generated study materials and comments
- **Platform Adoption**: New user registrations and group formations
- **Study Completion**: Percentage of studies completed by groups

## Technical Requirements
- **Performance**: Sub-2 second page loads, real-time collaboration updates
- **Scalability**: Support for 1000+ concurrent users across multiple study groups
- **Security**: Secure authentication, role-based access control, data protection
- **Reliability**: 99.9% uptime, automated backups, error monitoring
- **Accessibility**: WCAG 2.1 AA compliance for inclusive access

This platform aims to revolutionize small group Bible study by providing modern, collaborative tools that enhance spiritual growth and community engagement through technology.