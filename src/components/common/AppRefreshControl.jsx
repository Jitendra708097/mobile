import React from 'react';
import { RefreshControl } from 'react-native';

import { colors } from '../../theme/colors.js';

const AppRefreshControl = ({ refreshing, onRefresh, ...props }) => (
  <RefreshControl
    refreshing={refreshing}
    onRefresh={onRefresh}
    tintColor={colors.accent}
    colors={[colors.accent]}
    progressBackgroundColor={colors.bgSurface}
    {...props}
  />
);

export default AppRefreshControl;
