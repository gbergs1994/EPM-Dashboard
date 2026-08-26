import React from 'react';

const UserAvatar = ({ 
  user, 
  size = 'md', 
  showName = false, 
  showTitle = false, 
  onClick = null,
  className = '' 
}) => {
  // Size configurations
  const sizeConfig = {
    xs: { width: 24, height: 24, fontSize: 10 },
    sm: { width: 32, height: 32, fontSize: 12 },
    md: { width: 40, height: 40, fontSize: 14 },
    lg: { width: 56, height: 56, fontSize: 18 },
    xl: { width: 80, height: 80, fontSize: 24 },
    '2xl': { width: 120, height: 120, fontSize: 32 }
  };

  const { width, height, fontSize } = sizeConfig[size] || sizeConfig.md;

  // Get user initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate consistent color based on name
  const getAvatarColor = (name) => {
    if (!name) return '#6b7280';
    
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308',
      '#84cc16', '#22c55e', '#10b981', '#14b8a6',
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const userName = user?.name || '';
  const userAvatar = user?.avatar;
  const userTitle = user?.title || user?.role || '';
  const userDepartment = user?.department || '';

  // Validate avatar URL - only use if it's a proper data URL
  const isValidAvatar = userAvatar && 
    typeof userAvatar === 'string' && 
    userAvatar.startsWith('data:image') && 
    userAvatar.length > 50; // Ensure it's not just a header

  console.log('🖼️ UserAvatar debug:', {
    userName,
    hasAvatar: !!userAvatar,
    isValidAvatar,
    avatarLength: userAvatar?.length || 0,
    avatarStart: userAvatar?.substring(0, 50) || 'none'
  });

  const avatarStyle = {
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: '50%',
    backgroundColor: isValidAvatar ? 'transparent' : getAvatarColor(userName),
    backgroundImage: isValidAvatar ? `url("${userAvatar}")` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: `${fontSize}px`,
    fontWeight: '600',
    border: '2px solid #f3f4f6',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    overflow: 'hidden'
  };

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: showName || showTitle ? '12px' : '0'
  };

  const Avatar = () => (
    <div 
      style={avatarStyle}
      onClick={onClick}
      className={className}
      title={userName}
    >
      {!isValidAvatar && getInitials(userName)}
    </div>
  );

  if (!showName && !showTitle) {
    return <Avatar />;
  }

  return (
    <div style={containerStyle}>
      <Avatar />
      {(showName || showTitle) && (
        <div style={{ minWidth: 0, flex: 1 }}>
          {showName && (
            <p style={{
              margin: 0,
              fontSize: size === 'xs' || size === 'sm' ? '14px' : '16px',
              fontWeight: '600',
              color: '#111827',
              lineHeight: '1.2',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {userName}
            </p>
          )}
          {showTitle && (userTitle || userDepartment) && (
            <p style={{
              margin: 0,
              fontSize: size === 'xs' || size === 'sm' ? '12px' : '14px',
              color: '#6b7280',
              lineHeight: '1.2',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {[userTitle, userDepartment].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Usage Examples Component (for demonstration)
const UserAvatarExamples = () => {
  const sampleUser = {
    name: 'John Doe',
    title: 'Senior Developer',
    department: 'Engineering',
    avatar: '' // Set to empty to see initials, or provide image URL
  };

  const userWithAvatar = {
    name: 'Jane Smith',
    title: 'Product Manager',
    department: 'Product',
    avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h2>User Avatar Component Examples</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Different Sizes</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <UserAvatar user={sampleUser} size="xs" />
          <UserAvatar user={sampleUser} size="sm" />
          <UserAvatar user={sampleUser} size="md" />
          <UserAvatar user={sampleUser} size="lg" />
          <UserAvatar user={sampleUser} size="xl" />
          <UserAvatar user={sampleUser} size="2xl" />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>With Name and Title</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <UserAvatar user={sampleUser} showName size="md" />
          <UserAvatar user={sampleUser} showName showTitle size="lg" />
          <UserAvatar user={userWithAvatar} showName showTitle size="lg" />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>In Navigation/Header Context</h3>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h4 style={{ margin: 0 }}>Dashboard</h4>
          <UserAvatar 
            user={sampleUser} 
            showName 
            size="sm" 
            onClick={() => alert('Profile clicked!')}
          />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>In Team List Context</h3>
        <div style={{ 
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px'
        }}>
          {[sampleUser, userWithAvatar, 
            { name: 'Mike Johnson', title: 'Designer', department: 'Design' },
            { name: 'Sarah Wilson', title: 'QA Engineer', department: 'Engineering' }
          ].map((user, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: index < 3 ? '1px solid #f1f5f9' : 'none'
            }}>
              <UserAvatar user={user} showName showTitle size="md" />
              <button style={{
                padding: '6px 12px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}>
                View Profile
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3>Usage Instructions</h3>
        <div style={{ 
          backgroundColor: '#f8fafc', 
          padding: '16px', 
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <p><strong>Import:</strong> <code>import UserAvatar from './UserAvatar';</code></p>
          <p><strong>Basic usage:</strong> <code>{'<UserAvatar user={currentUser} />'}</code></p>
          <p><strong>With name:</strong> <code>{'<UserAvatar user={currentUser} showName />'}</code></p>
          <p><strong>Different size:</strong> <code>{'<UserAvatar user={currentUser} size="lg" />'}</code></p>
          <p><strong>Clickable:</strong> <code>{'<UserAvatar user={currentUser} onClick={handleProfileClick} />'}</code></p>
          <p><strong>Available sizes:</strong> xs, sm, md (default), lg, xl, 2xl</p>
        </div>
      </div>
    </div>
  );
};

export default UserAvatar;
export { UserAvatarExamples };