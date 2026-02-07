import AppButton from './AppButton';
import React from 'react';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import VerticalAlignBottomOutlinedIcon from '@mui/icons-material/VerticalAlignBottomOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export { default as AppButton } from './AppButton';

export const EditButton = ({ children = 'Edytuj', onClick, className = '', ariaLabel = 'Edytuj', hideLabelOnMobile = true }) => (
  <AppButton icon={<EditNoteOutlinedIcon fontSize="small" />} variant="primary" onClick={onClick} ariaLabel={ariaLabel} className={className} hideLabelOnMobile={hideLabelOnMobile}>
    {children}
  </AppButton>
);

export const DeleteButton = ({ children = 'Usuń', onClick, className = '', ariaLabel = 'Usuń', hideLabelOnMobile = true }) => (
  <AppButton icon={<DeleteOutlineIcon fontSize="small" />} variant="danger" onClick={onClick} ariaLabel={ariaLabel} className={className} hideLabelOnMobile={hideLabelOnMobile}>
    {children}
  </AppButton>
);

export const SaveButton = ({ children = 'Zapisz', onClick, className = '', ariaLabel = 'Zapisz', hideLabelOnMobile = true, disabled = false }) => (
  <AppButton icon={<CheckIcon fontSize="small" />} variant="primary" onClick={onClick} ariaLabel={ariaLabel} className={className} hideLabelOnMobile={hideLabelOnMobile} disabled={disabled}>
    {children}
  </AppButton>
);

export const CancelButton = ({ children = 'Anuluj', onClick, className = '', ariaLabel = 'Anuluj', hideLabelOnMobile = true, disabled = false }) => (
  <AppButton icon={<CloseIcon fontSize="small" />} variant="ghost" onClick={onClick} ariaLabel={ariaLabel} className={className} hideLabelOnMobile={hideLabelOnMobile} disabled={disabled}>
    {children}
  </AppButton>
);

export const UseButton = ({ children = 'Użyj', onClick, className = '', ariaLabel = 'Użyj', hideLabelOnMobile = true }) => (
  <AppButton icon={<VerticalAlignBottomOutlinedIcon fontSize="small" />} variant="primary" onClick={onClick} ariaLabel={ariaLabel} className={className} hideLabelOnMobile={hideLabelOnMobile}>
    {children}
  </AppButton>
);

export const TransferButton = ({ children = 'Przenieś', onClick, className = '', ariaLabel = 'Przenieś', hideLabelOnMobile = true }) => (
  <AppButton icon={<SwapHorizIcon fontSize="small" />} variant="primary" onClick={onClick} ariaLabel={ariaLabel} className={className} hideLabelOnMobile={hideLabelOnMobile}>
    {children}
  </AppButton>
);

export default AppButton;
